import api from './api';
import {
    getSyncQueue,
    setSyncQueue,
    QueuedOperation,
    dequeueOperation,
    updateOperationRetry,
    getCachedNoteById,
    updateCachedNote,
    removeCachedNote,
    setLastSyncTime,
} from './storage';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 10000]; // Exponential backoff

interface SyncResult {
    successful: number;
    failed: number;
    remaining: number;
}

export const processSyncQueue = async (): Promise<SyncResult> => {
    const queue = await getSyncQueue();

    if (queue.length === 0) {
        return { successful: 0, failed: 0, remaining: 0 };
    }

    console.log(`📤 Processing ${queue.length} queued operations...`);

    let successful = 0;
    let failed = 0;
    const failedNoteCreationIds = new Set<string | number>();

    // Identify all pending Note CREATIONs in the queue
    const pendingNoteCreations = new Set<string>(
        queue
            .filter(op => op.type === 'CREATE' && op.resourceType === 'note')
            .map(op => op.resourceId as string)
    );

    // Group operations by dependency
    const noteCreations: QueuedOperation[] = [];
    const independentOps: QueuedOperation[] = [];
    const dependentOps: Map<string | number, QueuedOperation[]> = new Map();

    for (const operation of queue) {
        // Skip if max retries exceeded
        if (operation.retryCount >= MAX_RETRIES) {
            console.warn(`⚠️ Operation ${operation.id} exceeded max retries, dropping from queue`);
            await dequeueOperation(operation.id);
            failed++;
            continue;
        }

        // 2. Resolve the Target Note ID for this operation
        let targetNoteId: string | null = null;
        if (operation.resourceType === 'note') {
            targetNoteId = operation.resourceId as string;
        } else if (operation.payload?.noteId) {
            targetNoteId = operation.payload.noteId;
        }

        // 3. Check for ORPHANS: Targeting an offline note that is NOT pending creation
        // (If the note is not in pendingNoteCreations, and it's an offline_ ID, 
        //  it means the original CREATE failed max retries or was lost. 
        //  We must discard this dependent op.)

        // Ensure strictly string for verification
        const targetNoteIdString = targetNoteId ? String(targetNoteId) : '';
        const isTargetingOffline = targetNoteIdString.startsWith('offline_');

        // A Note CREATE operation targets itself, so it IS found in pendingNoteCreations.
        // We only care if we CANT find it.
        if (isTargetingOffline && !pendingNoteCreations.has(targetNoteIdString)) {
            console.warn(`🗑️ Discarding orphan operation ${operation.id} (targets missing offline note ${targetNoteId})`);
            await dequeueOperation(operation.id);
            failed++;
            continue;
        }

        if (operation.type === 'CREATE' && operation.resourceType === 'note') {
            noteCreations.push(operation);
        } else if (typeof operation.resourceId === 'string' && operation.resourceId.startsWith('offline_')) {
            // Dependent on note creation
            if (!dependentOps.has(operation.resourceId)) {
                dependentOps.set(operation.resourceId, []);
            }
            dependentOps.get(operation.resourceId)!.push(operation);
        } else if (operation.payload?.noteId && String(operation.payload.noteId).startsWith('offline_')) {
            // Also dependent if payload contains an offline noteId
            const dependentOnId = String(operation.payload.noteId);
            if (!dependentOps.has(dependentOnId)) {
                dependentOps.set(dependentOnId, []);
            }
            dependentOps.get(dependentOnId)!.push(operation);
        }
        else {
            // Independent operation
            independentOps.push(operation);
        }
    }

    // Process note creations first (must be sequential for ID mapping)
    for (const operation of noteCreations) {
        try {
            const oldId = operation.resourceId;
            await processOperation(operation);
            successful++;
            await dequeueOperation(operation.id);

            // Process dependent operations immediately after note creation
            const deps = dependentOps.get(oldId) || [];
            for (const depOp of deps) {
                try {
                    await processOperation(depOp);
                    successful++;
                    await dequeueOperation(depOp.id);
                } catch (error: any) {
                    await handleOperationError(depOp, error);
                    failed++;
                }
            }
            dependentOps.delete(oldId);
        } catch (error: any) {
            await handleOperationError(operation, error);
            failedNoteCreationIds.add(operation.resourceId);
            failed++;

            // Skip dependent operations if note creation failed
            const deps = dependentOps.get(operation.resourceId) || [];
            for (const depOp of deps) {
                console.warn(`⏭️ Skipping dependent operation ${depOp.id} due to failed note creation`);
                await dequeueOperation(depOp.id);
                failed++;
            }
            dependentOps.delete(operation.resourceId);
        }
    }

    // Process independent operations in parallel (batches of 20)
    const BATCH_SIZE = 20; // Increased from 5 for faster sync
    for (let i = 0; i < independentOps.length; i += BATCH_SIZE) {
        const batch = independentOps.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
            batch.map(async (op) => {
                try {
                    await processOperation(op);
                    await dequeueOperation(op.id);
                    return { success: true };
                } catch (error: any) {
                    await handleOperationError(op, error);
                    return { success: false };
                }
            })
        );

        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value.success) {
                successful++;
            } else {
                failed++;
            }
        });
    }

    // Update last sync time if any operations were successful
    if (successful > 0) {
        await setLastSyncTime(new Date().toISOString());
    }

    const remaining = await getSyncQueue();
    return { successful, failed, remaining: remaining.length };
};

// Helper function to handle operation errors
const handleOperationError = async (operation: QueuedOperation, error: any): Promise<void> => {
    const errorMsg = error.response?.data
        ? JSON.stringify(error.response.data)
        : error.message;

    console.error(`❌ Failed to process operation ${operation.id} (${operation.type}):`, errorMsg);

    // STOP retrying if resource is not found (404) on server
    if (error.response?.status === 404) {
        console.warn(`🗑️ Target resource not found (404), discarding operation ${operation.id}`);
        await dequeueOperation(operation.id);
        return;
    }

    if (error.response?.status === 422) {
        console.error('Validation Errors:', error.response.data.errors);
    }

    // Update retry count and keep in queue
    await updateOperationRetry(operation.id, errorMsg);
};

const processOperation = async (operation: QueuedOperation): Promise<void> => {
    console.log(`Processing ${operation.type} ${operation.resourceType}:`, operation.resourceId);

    switch (operation.type) {
        case 'CREATE':
            await processCreate(operation);
            break;
        case 'UPDATE':
            await processUpdate(operation);
            break;
        case 'DELETE':
            await processDelete(operation);
            break;
        case 'UPLOAD_IMAGE':
            await processImageUpload(operation);
            break;
        case 'CREATE_REMINDER':
            await processReminderCreate(operation);
            break;
        case 'DELETE_REMINDER':
            await processReminderDelete(operation);
            break;
        case 'ATTACH_LABEL':
            await processLabelAttach(operation);
            break;
        case 'DETACH_LABEL':
            await processLabelDetach(operation);
            break;
        case 'CREATE_CHECKLIST':
            await processChecklistCreate(operation);
            break;
        case 'CREATE_AUDIO':
            await processAudioCreate(operation);
            break;
        case 'CREATE_DRAWING':
            await processDrawingCreate(operation);
            break;
        case 'DELETE_IMAGE':
            await processImageDelete(operation);
            break;
        case 'DELETE_AUDIO':
            await processAudioDelete(operation);
            break;
        case 'DELETE_DRAWING':
            await processDrawingDelete(operation);
            break;
        case 'UPDATE_CHECKLIST':
            await processChecklistUpdate(operation);
            break;
        case 'DELETE_CHECKLIST':
            await processChecklistDelete(operation);
            break;
        default:
            throw new Error(`Unknown operation type: ${operation.type}`);
    }
};

const processAudioCreate = async (operation: QueuedOperation): Promise<void> => {
    const { noteId, audioFile } = operation.payload;

    if (!audioFile || !audioFile.uri) {
        throw new Error("Missing audioFile in operation payload");
    }

    console.log(`PREPARING AUDIO UPLOAD: ${audioFile.uri}, ID: ${noteId}`);

    const formData = new FormData();
    formData.append('audio', {
        uri: audioFile.uri,
        name: audioFile.name,
        type: audioFile.type,
    } as any);

    // Use fetch instead of axios for proper FormData handling in React Native
    const token = await import('expo-secure-store').then(m => m.getItemAsync('auth_token'));
    const response = await fetch(`${api.defaults.baseURL}/notes/${noteId}/audio`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            // Don't set Content-Type - let fetch set it with boundary
        },
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(JSON.stringify(error));
    }

    console.log(`✅ Audio uploaded for note ${noteId}`);
};

const processDrawingCreate = async (operation: QueuedOperation): Promise<void> => {
    const { noteId, drawing_uri } = operation.payload;

    if (!drawing_uri) {
        throw new Error("Missing drawing_uri in operation payload");
    }

    // drawing_uri is a file URI from ViewShot.capture()
    console.log(`PREPARING DRAWING UPLOAD: ${drawing_uri}, ID: ${noteId}`);
    // Extract filename from URI
    const filename = drawing_uri.split('/').pop() || 'drawing.png';

    const formData = new FormData();
    formData.append('drawing', {
        uri: drawing_uri,
        name: filename,
        type: 'image/png',
    } as any);

    try {
        // Use fetch instead of axios for proper FormData handling in React Native
        const token = await import('expo-secure-store').then(m => m.getItemAsync('auth_token'));

        console.log(`🔍 Drawing upload details:`, {
            url: `${api.defaults.baseURL}/notes/${noteId}/drawings`,
            filename,
            uri: drawing_uri,
        });

        const response = await fetch(`${api.defaults.baseURL}/notes/${noteId}/drawings`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                // Don't set Content-Type - let fetch set it with boundary
            },
            body: formData,
        });

        console.log(`📡 Drawing upload response status: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Drawing upload failed with status ${response.status}:`, errorText);
            throw new Error(errorText || `HTTP ${response.status}`);
        }

        console.log(`✅ Drawing uploaded for note ${noteId}`);
    } catch (error: any) {
        console.error(`Drawing upload error for note ${noteId}:`, {
            message: error.message || 'Unknown error',
            name: error.name || 'Unknown',
            type: typeof error,
            errorString: String(error),
            stack: error.stack?.substring(0, 300),
        });

        // Re-throw with more context
        const enhancedError = new Error(`Drawing upload failed: ${error.message || 'Network request failed'}`);
        (enhancedError as any).originalError = error;
        throw enhancedError;
    }
};

const processCreate = async (operation: QueuedOperation): Promise<void> => {
    if (operation.resourceType === 'note') {
        const response = await api.post('/notes', operation.payload);
        const serverNote = response.data;

        // Update cached note with server ID
        // Update cached note with server ID
        const tempId = operation.resourceId;
        const oldCached = await getCachedNoteById(tempId);
        await removeCachedNote(tempId);

        // Preserve local-only fields that haven't been synced yet
        const mergedData = { ...serverNote };
        if (oldCached?.data) {
            if (oldCached.data.drawing_uri) mergedData.drawing_uri = oldCached.data.drawing_uri;
            if (oldCached.data.audio_uri) mergedData.audio_uri = oldCached.data.audio_uri;
            // Preserve temp images that might be uploading
            if (oldCached.data.images && oldCached.data.images.some((img: any) => img.id.toString().startsWith('temp_'))) {
                const serverImages = serverNote.images || [];
                const localImages = oldCached.data.images.filter((img: any) => img.id.toString().startsWith('temp_'));
                mergedData.images = [...serverImages, ...localImages];
            }
        }

        await updateCachedNote(serverNote.id, {
            id: serverNote.id,
            data: mergedData,
            locallyModified: false,
            lastSyncedAt: new Date().toISOString(),
        });

        console.log(`✅ Note created on server with ID: ${serverNote.id}`);

        // CRITICAL: Update pending references in the queue
        // Any subsequent operations (images, checklists) still have the temp ID
        const currentQueue = await getSyncQueue();
        let queueModified = false;

        const updatedQueue = currentQueue.map(op => {
            let opModified = false;
            let newOp = { ...op };

            // 1. Update resourceId if it matches tempId (e.g. UPDATE note)
            if (newOp.resourceId === tempId) {
                newOp.resourceId = serverNote.id;
                opModified = true;
            }

            // 2. Update payload.noteId if it matches tempId (e.g. CREATE checklist)
            if (newOp.payload && newOp.payload.noteId === tempId) {
                newOp.payload = { ...newOp.payload, noteId: serverNote.id };
                opModified = true;
            }

            if (opModified) queueModified = true;
            return newOp;
        });

        if (queueModified) {
            await setSyncQueue(updatedQueue);
            console.log(`🔄 Updated pending queue operations with real ID ${serverNote.id}`);
        }
    }
};

const processUpdate = async (operation: QueuedOperation): Promise<void> => {
    if (operation.resourceType === 'note') {
        await api.put(`/notes/${operation.resourceId}`, operation.payload);

        // Update cache to reflect sync
        await updateCachedNote(operation.resourceId, {
            locallyModified: false,
            lastSyncedAt: new Date().toISOString(),
        });

        console.log(`✅ Note ${operation.resourceId} updated on server`);
    }
};

const processDelete = async (operation: QueuedOperation): Promise<void> => {
    if (operation.resourceType === 'note') {
        // Only delete on server if it's a real server ID (not a temp offline ID)
        if (typeof operation.resourceId === 'number') {
            await api.delete(`/notes/${operation.resourceId}`);
        }

        // Remove from cache
        await removeCachedNote(operation.resourceId);

        console.log(`✅ Note ${operation.resourceId} deleted from server`);
    }
};

const processImageUpload = async (operation: QueuedOperation): Promise<void> => {
    const { noteId, imageFile } = operation.payload;

    const formData = new FormData();
    formData.append('image', {
        uri: imageFile.uri,
        name: imageFile.name,
        type: imageFile.type,
    } as any);

    // Use fetch instead of axios for proper FormData handling in React Native
    const token = await import('expo-secure-store').then(m => m.getItemAsync('auth_token'));
    const response = await fetch(`${api.defaults.baseURL}/notes/${noteId}/images`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
        },
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(JSON.stringify(error));
    }

    console.log(`✅ Image uploaded for note ${noteId}`);
};

const processReminderCreate = async (operation: QueuedOperation): Promise<void> => {
    const { noteId, remind_at } = operation.payload;

    await api.post(`/notes/${noteId}/reminders`, { remind_at });

    console.log(`✅ Reminder created for note ${noteId}`);
};

const processReminderDelete = async (operation: QueuedOperation): Promise<void> => {
    const { reminderId } = operation.payload;

    if (reminderId && typeof reminderId === 'number') {
        await api.delete(`/reminders/${reminderId}`);
        console.log(`✅ Reminder ${reminderId} deleted`);
    }
};

const processLabelAttach = async (operation: QueuedOperation): Promise<void> => {
    const { noteId, labelId } = operation.payload;

    await api.post(`/notes/${noteId}/labels`, { label_id: labelId });

    console.log(`✅ Label ${labelId} attached to note ${noteId}`);
};

const processLabelDetach = async (operation: QueuedOperation): Promise<void> => {
    const { noteId, labelId } = operation.payload;

    await api.delete(`/notes/${noteId}/labels/${labelId}`);

    console.log(`✅ Label ${labelId} detached from note ${noteId}`);
};

const processChecklistCreate = async (operation: QueuedOperation): Promise<void> => {
    const { noteId, text, is_completed } = operation.payload;

    await api.post(`/notes/${noteId}/checklist`, { text, is_completed });

    console.log(`✅ Checklist item created for note ${noteId}`);
};

const processChecklistUpdate = async (operation: QueuedOperation): Promise<void> => {
    const { text, is_completed } = operation.payload;
    const itemId = operation.resourceId;

    if (itemId && typeof itemId === 'number') {
        await api.put(`/checklist/${itemId}`, { text, is_completed });
        console.log(`✅ Checklist item ${itemId} updated`);
    }
};

const processChecklistDelete = async (operation: QueuedOperation): Promise<void> => {
    const { itemId } = operation.payload;

    if (itemId && typeof itemId === 'number') {
        await api.delete(`/checklist/${itemId}`);
        console.log(`✅ Checklist item ${itemId} deleted`);
    }
};

const processImageDelete = async (operation: QueuedOperation): Promise<void> => {
    const { imageId } = operation.payload;
    if (imageId && typeof imageId === 'number') {
        await api.delete(`/notes/images/${imageId}`);
        console.log(`✅ Image ${imageId} deleted`);
    }
};

const processAudioDelete = async (operation: QueuedOperation): Promise<void> => {
    const { audioId } = operation.payload;
    if (audioId && typeof audioId === 'number') {
        await api.delete(`/notes/audio/${audioId}`);
        console.log(`✅ Audio ${audioId} deleted`);
    }
};

const processDrawingDelete = async (operation: QueuedOperation): Promise<void> => {
    const { drawingId } = operation.payload;
    if (drawingId && typeof drawingId === 'number') {
        await api.delete(`/notes/drawings/${drawingId}`);
        console.log(`✅ Drawing ${drawingId} deleted`);
    }
};

// Manual retry with exponential backoff (not currently used, but available)
export const retryWithBackoff = async <T>(
    fn: () => Promise<T>,
    retries: number = MAX_RETRIES
): Promise<T> => {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === retries - 1) throw error;

            const delay = RETRY_DELAYS[i] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
            console.log(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw new Error('Max retries exceeded');
};

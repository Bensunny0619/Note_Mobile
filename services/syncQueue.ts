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

let isSyncing = false;

export const processSyncQueue = async (): Promise<SyncResult> => {
    if (isSyncing) {
        console.log('🔄 Sync already in progress, skipping...');
        return { successful: 0, failed: 0, remaining: 0 };
    }

    let queue = await getSyncQueue();

    if (queue.length === 0) {
        return { successful: 0, failed: 0, remaining: 0 };
    }

    isSyncing = true;
    try {
        console.log(`📤 Processing ${queue.length} queued operations...`);

        // Auto-clear stuck operations (exceeded retries or too old)
        const now = Date.now();
        const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes
        const initialLength = queue.length;

        queue = queue.filter(op => {
            if (op.retryCount >= MAX_RETRIES) {
                console.warn(`⚠️ Auto-removing operation ${op.id} (exceeded ${MAX_RETRIES} retries)`);
                return false;
            }
            const age = now - new Date(op.createdAt).getTime();
            if (age > MAX_AGE_MS) {
                console.warn(`⚠️ Auto-removing stale operation ${op.id} (age: ${Math.round(age / 60000)}min)`);
                return false;
            }
            return true;
        });

        if (queue.length < initialLength) {
            await setSyncQueue(queue);
            console.log(`✅ Auto-cleared ${initialLength - queue.length} stuck operation(s)`);
        }

        if (queue.length === 0) {
            return { successful: 0, failed: 0, remaining: 0 };
        }

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
        const dependentOps: Map<string | number, QueuedOperation[]> = new Map();

        for (const operation of queue) {
            let targetNoteId: string | null = null;
            if (operation.resourceType === 'note') {
                targetNoteId = operation.resourceId as string;
            } else if (operation.payload?.noteId) {
                targetNoteId = operation.payload.noteId;
            }

            const targetNoteIdString = targetNoteId ? String(targetNoteId) : '';
            const isTargetingOffline = targetNoteIdString.startsWith('offline_');

            if (isTargetingOffline && !pendingNoteCreations.has(targetNoteIdString)) {
                console.warn(`🗑️ Discarding orphan operation ${operation.id} (targets missing offline note ${targetNoteId})`);
                await dequeueOperation(operation.id);
                failed++;
                continue;
            }

            if (operation.type === 'CREATE' && operation.resourceType === 'note') {
                noteCreations.push(operation);
            } else if (typeof operation.resourceId === 'string' && operation.resourceId.startsWith('offline_')) {
                if (!dependentOps.has(operation.resourceId)) {
                    dependentOps.set(operation.resourceId, []);
                }
                dependentOps.get(operation.resourceId)!.push(operation);
            } else if (operation.payload?.noteId && String(operation.payload.noteId).startsWith('offline_')) {
                const dependentOnId = String(operation.payload.noteId);
                if (!dependentOps.has(dependentOnId)) {
                    dependentOps.set(dependentOnId, []);
                }
                dependentOps.get(dependentOnId)!.push(operation);
            }
        }

        // Process note creations first (must be sequential for ID mapping)
        for (const operation of noteCreations) {
            try {
                await processOperation(operation);
                successful++;
                await dequeueOperation(operation.id);
            } catch (error: any) {
                await handleOperationError(operation, error);
                failedNoteCreationIds.add(operation.resourceId);
                failed++;

                const deps = dependentOps.get(operation.resourceId) || [];
                for (const depOp of deps) {
                    console.warn(`⏭️ Skipping dependent operation ${depOp.id} due to failed note creation`);
                    await dequeueOperation(depOp.id);
                    failed++;
                }
            }
        }

        // After all note creations are processed, re-fetch the queue 
        // to get updated IDs for dependent operations
        const refreshedQueue = await getSyncQueue();

        // Remaining independent operations
        const activeIndependentOps = refreshedQueue.filter(op =>
            !failedNoteCreationIds.has(op.resourceId) &&
            !(op.payload?.noteId && failedNoteCreationIds.has(op.payload.noteId))
        );

        // Process independent operations in parallel (batches of 20)
        const BATCH_SIZE = 20;
        for (let i = 0; i < activeIndependentOps.length; i += BATCH_SIZE) {
            const batch = activeIndependentOps.slice(i, i + BATCH_SIZE);
            const results = await Promise.allSettled(
                batch.map(async (op) => {
                    try {
                        await processOperation(op);
                        return { id: op.id, success: true };
                    } catch (error: any) {
                        await handleOperationError(op, error);
                        return { id: op.id, success: false };
                    }
                })
            );

            // Sequential dequeue for thread safety
            for (const result of results) {
                if (result.status === 'fulfilled') {
                    if (result.value.success) {
                        successful++;
                        await dequeueOperation(result.value.id);
                    } else {
                        failed++;
                    }
                } else {
                    failed++;
                }
            }
        }

        if (successful > 0) {
            await setLastSyncTime(new Date().toISOString());
        }

        const remaining = await getSyncQueue();
        return { successful, failed, remaining: remaining.length };
    } finally {
        isSyncing = false;
    }
};

// Helper function to handle operation errors
const handleOperationError = async (operation: QueuedOperation, error: any): Promise<void> => {
    const errorMsg = error.response?.data
        ? JSON.stringify(error.response.data)
        : error.message;

    console.error(`❌ Failed to process operation ${operation.id} (${operation.type}):`, errorMsg);

    // STOP retrying if unauthenticated (401)
    if (error.response?.status === 401) {
        console.warn('⏹️ Unauthenticated (401), stopping sync queue processing');
        throw error; // Rethrow to stop the loop in processSyncQueue
    }

    // STOP retrying if resource is not found (404) on server
    if (error.response?.status === 404) {
        console.warn(`🗑️ Target resource not found (404), discarding operation ${operation.id}`);
        await dequeueOperation(operation.id);
        return;
    }

    if (error.response?.status === 422) {
        console.error('Validation Errors:', error.response.data.errors);
        // If it's a "date after now" error, it's a terminal error for sync, discard it
        const errors = JSON.stringify(error.response.data.errors);
        if (errors.includes('date after now')) {
            console.warn(`🗑️ Discarding operation ${operation.id} due to past date validation`);
            await dequeueOperation(operation.id);
            return;
        }
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
        case 'PIN_NOTE':
            await processPin(operation);
            break;
        case 'UNPIN_NOTE':
            await processUnpin(operation);
            break;
        case 'ARCHIVE_NOTE':
            await processArchive(operation);
            break;
        case 'UNARCHIVE_NOTE':
            await processUnarchive(operation);
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

    try {
        // First, verify the file exists using expo-file-system new API
        const { File: FileClass } = await import('expo-file-system');
        const file = new FileClass(drawing_uri);
        const exists = file.exists;

        console.log(`📁 File info:`, {
            exists,
            uri: drawing_uri,
        });

        if (!exists) {
            throw new Error(`Drawing file does not exist at ${drawing_uri}`);
        }

        // Extract filename from URI
        const filename = drawing_uri.split('/').pop() || 'drawing.png';

        // Use fetch instead of axios for proper FormData handling in React Native
        const token = await import('expo-secure-store').then(m => m.getItemAsync('auth_token'));

        console.log(`🔍 Drawing upload details:`, {
            url: `${api.defaults.baseURL}/notes/${noteId}/drawings`,
            filename,
            uri: drawing_uri,
        });

        // For React Native, we need to use the file URI directly in FormData
        // The URI should work if it's from expo-file-system cache
        const formData = new FormData();
        formData.append('drawing', {
            uri: drawing_uri,
            name: filename,
            type: 'image/png',
        } as any);

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
        console.error(`❌ Drawing upload error for note ${noteId}:`, {
            message: error.message,
            name: error.name,
            uri: drawing_uri,
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
        // Any subsequent operations (images, checklists, drawings, audio) still have the temp ID
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

            // 2. Update various payload fields that might contain the note ID
            if (newOp.payload) {
                // Common field is noteId
                if (newOp.payload.noteId === tempId) {
                    newOp.payload = { ...newOp.payload, noteId: serverNote.id };
                    opModified = true;
                }

                // Drawing and Audio might use different structures or just noteId
                // The current processDrawingCreate and processAudioCreate use payload.noteId
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

    await api.post(`/notes/${noteId}/reminder`, { remind_at });

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
    const tempId = operation.resourceId;

    const response = await api.post(`/notes/${noteId}/checklist`, { text, is_completed });
    const serverItem = response.data;

    console.log(`✅ Checklist item created for note ${noteId} with server ID ${serverItem.id}`);

    // Update pending references in the queue for THIS checklist item
    const currentQueue = await getSyncQueue();
    let queueModified = false;

    const updatedQueue = currentQueue.map(op => {
        let opModified = false;
        let newOp = { ...op };

        // Update resourceId if it matches tempId (e.g. UPDATE_CHECKLIST, DELETE_CHECKLIST)
        if (newOp.resourceId === tempId && (newOp.type === 'UPDATE_CHECKLIST' || newOp.type === 'DELETE_CHECKLIST')) {
            newOp.resourceId = serverItem.id;
            opModified = true;
        }

        // Checklist items might also be referenced in payload as itemId? 
        // Based on offlineApi, they aren't, but let's be safe
        if (newOp.payload && newOp.payload.itemId === tempId) {
            newOp.payload = { ...newOp.payload, itemId: serverItem.id };
            opModified = true;
        }

        if (opModified) queueModified = true;
        return newOp;
    });

    if (queueModified) {
        await setSyncQueue(updatedQueue);
        console.log(`🔄 Updated pending checklist operations with real ID ${serverItem.id}`);
    }

    // Also update the cached note's checklist items list
    const cached = await getCachedNoteById(noteId);
    if (cached) {
        const updatedChecklist = (cached.data.checklist_items || []).map((item: any) => {
            if (item.id === tempId) {
                return { ...item, id: serverItem.id };
            }
            return item;
        });
        await updateCachedNote(noteId, {
            data: { ...cached.data, checklist_items: updatedChecklist }
        });
    }
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

const processPin = async (operation: QueuedOperation): Promise<void> => {
    await api.put(`/notes/${operation.resourceId}/pin`);
    console.log(`✅ Note ${operation.resourceId} pinned on server`);
};

const processUnpin = async (operation: QueuedOperation): Promise<void> => {
    await api.put(`/notes/${operation.resourceId}/unpin`);
    console.log(`✅ Note ${operation.resourceId} unpinned on server`);
};

const processArchive = async (operation: QueuedOperation): Promise<void> => {
    await api.put(`/notes/${operation.resourceId}/archive`);
    console.log(`✅ Note ${operation.resourceId} archived on server`);
};

const processUnarchive = async (operation: QueuedOperation): Promise<void> => {
    await api.put(`/notes/${operation.resourceId}/unarchive`);
    console.log(`✅ Note ${operation.resourceId} unarchived on server`);
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

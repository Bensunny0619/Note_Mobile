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
    const remainingOperations: QueuedOperation[] = [];
    const failedNoteCreationIds = new Set<string | number>();

    // 1. Identify all pending Note CREATIONs in the queue
    const pendingNoteCreations = new Set<string>(
        queue
            .filter(op => op.type === 'CREATE' && op.resourceType === 'note')
            .map(op => op.resourceId as string)
    );

    for (const operation of queue) {
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

        // Check for dependencies on RECENTLY failed note creations (in this run)
        const dependentNoteId = operation.payload?.noteId || (operation.resourceType === 'note' ? operation.resourceId : null);
        if (dependentNoteId && failedNoteCreationIds.has(dependentNoteId)) {
            console.warn(`⏳ Skipping operation ${operation.id} due to failed parent note creation (${dependentNoteId})`);
            remainingOperations.push(operation);
            continue;
        }

        try {
            // Skip if max retries exceeded
            if (operation.retryCount >= MAX_RETRIES) {
                console.warn(`⚠️ Operation ${operation.id} exceeded max retries, dropping from queue`);
                await dequeueOperation(operation.id);
                failed++;
                continue;
            }

            await processOperation(operation);
            successful++;

            // Remove from queue after successful processing
            await dequeueOperation(operation.id);

            // CRITICAL: restart if ID mapping changed
            if (operation.type === 'CREATE' && operation.resourceType === 'note') {
                console.log('🔄 Note created, restarting sync queue processing to pick up ID updates...');
                const recursiveResult = await processSyncQueue();
                return {
                    successful: successful + recursiveResult.successful,
                    failed: failed + recursiveResult.failed,
                    remaining: recursiveResult.remaining
                };
            }

        } catch (error: any) {
            const errorMsg = error.response?.data
                ? JSON.stringify(error.response.data)
                : error.message;

            console.error(`❌ Failed to process operation ${operation.id} (${operation.type}):`, errorMsg);

            // STOP retrying if resource is not found (404) on server
            // This prevents stuck queue when modifying deleted items
            if (error.response?.status === 404) {
                console.warn(`🗑️ Target resource not found (404), discarding operation ${operation.id}`);
                await dequeueOperation(operation.id);
                failed++;
                continue;
            }

            // Track failed note creations to skip dependents
            if (operation.type === 'CREATE' && operation.resourceType === 'note') {
                failedNoteCreationIds.add(operation.resourceId);
            }

            if (error.response?.status === 422) {
                console.error('Validation Errors:', error.response.data.errors);
            }

            // Update retry count and keep in queue
            await updateOperationRetry(operation.id, errorMsg);
            remainingOperations.push(operation);
            failed++;
        }
    }

    // Update last sync time if any operations were successful
    if (successful > 0) {
        await setLastSyncTime(new Date().toISOString());
    }

    return { successful, failed, remaining: remainingOperations.length };
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
    const { noteId, audio_uri } = operation.payload;

    const formData = new FormData();
    const filename = audio_uri.split('/').pop() || 'recording.m4a';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `audio/${match[1]}` : `audio/m4a`;

    formData.append('audio', {
        uri: audio_uri,
        name: filename,
        type,
    } as any);

    await api.post(`/notes/${noteId}/audio`, formData);

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
        await api.post(`/notes/${noteId}/drawings`, formData);

        console.log(`✅ Drawing uploaded for note ${noteId}`);
    } catch (e: any) {
        if (e.message === 'Network Error') {
            console.error('Drawing Upload Config:', {
                url: `/notes/${noteId}/drawings`,
                formDataParts: (formData as any)._parts,
            });
        }
        throw e;
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

    await api.post(`/notes/${noteId}/images`, formData);

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

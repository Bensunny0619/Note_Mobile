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

    for (const operation of queue) {
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

            // CRITICAL: If we just created a note, the rest of our in-memory 'queue' array is STALE
            // because processCreate updated the IDs in storage. We MUST restart processing to fetch fresh data.
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

    await api.post(`/notes/${noteId}/audio`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

    console.log(`✅ Audio uploaded for note ${noteId}`);
};

const processDrawingCreate = async (operation: QueuedOperation): Promise<void> => {
    const { noteId, drawing_base64 } = operation.payload;

    // Assuming backend accepts base64 string directly in JSON, 
    // OR expects a file upload. Given 'drawing_path' in DB, likely file upload.
    // Converting base64 to file upload requires some trickery or backend support.
    // If backend supports base64 string in JSON:
    // await api.post(`/notes/${noteId}/drawings`, { drawing: drawing_base64 });

    // BUT usually drawings are images. Let's try FormData with base64 data uri if supported, 
    // or just send as JSON 'image' field if backend handles base64 decoding.
    // Since we don't know backend implementation, we'll try sending as JSON first 
    // if it's base64, OR constructing a file object if we can.

    // Most robust for "drawing_base64" (which creates an image file on server):
    // Construct FormData with "data:image/png;base64,..." URI.

    const formData = new FormData();
    formData.append('drawing', {
        uri: drawing_base64.startsWith('data:') ? drawing_base64 : `data:image/png;base64,${drawing_base64}`,
        name: 'drawing.png',
        type: 'image/png',
    } as any);

    await api.post(`/notes/${noteId}/drawings`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

    console.log(`✅ Drawing uploaded for note ${noteId}`);
};

const processCreate = async (operation: QueuedOperation): Promise<void> => {
    if (operation.resourceType === 'note') {
        const response = await api.post('/notes', operation.payload);
        const serverNote = response.data;

        // Update cached note with server ID
        const tempId = operation.resourceId;
        await removeCachedNote(tempId);
        await updateCachedNote(serverNote.id, {
            id: serverNote.id,
            data: serverNote,
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

    await api.post(`/notes/${noteId}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

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

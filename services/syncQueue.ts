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
                console.warn(`⚠️ Operation ${operation.id} exceeded max retries, skipping`);
                failed++;
                continue;
            }

            await processOperation(operation);
            successful++;

            // Remove from queue after successful processing
            await dequeueOperation(operation.id);

        } catch (error: any) {
            console.error(`❌ Failed to process operation ${operation.id}:`, error.message);

            // Update retry count and keep in queue
            await updateOperationRetry(operation.id, error.message);
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
        default:
            throw new Error(`Unknown operation type: ${operation.type}`);
    }
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
    const { noteId, formData } = operation.payload;

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

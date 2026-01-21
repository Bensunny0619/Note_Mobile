import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const KEYS = {
    NOTES_CACHE: '@homa_notes_cache',
    SYNC_QUEUE: '@homa_sync_queue',
    LAST_SYNC: '@homa_last_sync',
    PENDING_COUNT: '@homa_pending_count',
};

export interface CachedNote {
    id: number | string;
    data: any;
    locallyModified: boolean;
    lastSyncedAt?: string;
}

export interface QueuedOperation {
    id: string;
    type: 'CREATE' | 'UPDATE' | 'DELETE' | 'UPLOAD_IMAGE' | 'DELETE_IMAGE' | 'CREATE_REMINDER' | 'DELETE_REMINDER' | 'ATTACH_LABEL' | 'DETACH_LABEL' | 'CREATE_CHECKLIST' | 'UPDATE_CHECKLIST' | 'DELETE_CHECKLIST' | 'CREATE_AUDIO' | 'DELETE_AUDIO' | 'CREATE_DRAWING' | 'DELETE_DRAWING';
    resourceType: 'note' | 'image' | 'reminder' | 'label' | 'checklist' | 'audio' | 'drawing';
    resourceId: string | number;
    payload: any;
    createdAt: string;
    retryCount: number;
    error?: string;
}

// Notes Cache Operations
export const getCachedNotes = async (): Promise<CachedNote[]> => {
    try {
        const cached = await AsyncStorage.getItem(KEYS.NOTES_CACHE);
        return cached ? JSON.parse(cached) : [];
    } catch (error) {
        console.error('Failed to get cached notes:', error);
        return [];
    }
};

export const setCachedNotes = async (notes: CachedNote[]): Promise<void> => {
    try {
        await AsyncStorage.setItem(KEYS.NOTES_CACHE, JSON.stringify(notes));
    } catch (error) {
        console.error('Failed to cache notes:', error);
    }
};

export const addCachedNote = async (note: CachedNote): Promise<void> => {
    const notes = await getCachedNotes();
    notes.push(note);
    await setCachedNotes(notes);
};

export const updateCachedNote = async (id: string | number, updates: Partial<CachedNote>): Promise<void> => {
    const notes = await getCachedNotes();
    const index = notes.findIndex(n => n.id === id);
    if (index !== -1) {
        notes[index] = { ...notes[index], ...updates };
        await setCachedNotes(notes);
    }
};

export const removeCachedNote = async (id: string | number): Promise<void> => {
    const notes = await getCachedNotes();
    const filtered = notes.filter(n => n.id !== id);
    await setCachedNotes(filtered);
};

export const getCachedNoteById = async (id: string | number): Promise<CachedNote | null> => {
    const notes = await getCachedNotes();
    return notes.find(n => n.id === id) || null;
};

// Sync Queue Operations
export const getSyncQueue = async (): Promise<QueuedOperation[]> => {
    try {
        const queue = await AsyncStorage.getItem(KEYS.SYNC_QUEUE);
        return queue ? JSON.parse(queue) : [];
    } catch (error) {
        console.error('Failed to get sync queue:', error);
        return [];
    }
};

export const setSyncQueue = async (queue: QueuedOperation[]): Promise<void> => {
    try {
        await AsyncStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify(queue));
        await AsyncStorage.setItem(KEYS.PENDING_COUNT, queue.length.toString());
    } catch (error) {
        console.error('Failed to set sync queue:', error);
    }
};

export const enqueueOperation = async (operation: Omit<QueuedOperation, 'id' | 'createdAt' | 'retryCount'>): Promise<void> => {
    const queue = await getSyncQueue();
    const newOp: QueuedOperation = {
        ...operation,
        id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        retryCount: 0,
    };
    queue.push(newOp);
    await setSyncQueue(queue);
    console.log('📝 Enqueued operation:', newOp.type, newOp.resourceType);
};

export const dequeueOperation = async (operationId: string): Promise<void> => {
    const queue = await getSyncQueue();
    const filtered = queue.filter(op => op.id !== operationId);
    await setSyncQueue(filtered);
};

export const updateOperationRetry = async (operationId: string, error: string): Promise<void> => {
    const queue = await getSyncQueue();
    const index = queue.findIndex(op => op.id === operationId);
    if (index !== -1) {
        queue[index].retryCount += 1;
        queue[index].error = error;
        await setSyncQueue(queue);
    }
};

export const getPendingCount = async (): Promise<number> => {
    try {
        const count = await AsyncStorage.getItem(KEYS.PENDING_COUNT);
        return count ? parseInt(count, 10) : 0;
    } catch (error) {
        return 0;
    }
};

// Metadata Operations
export const getLastSyncTime = async (): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem(KEYS.LAST_SYNC);
    } catch (error) {
        return null;
    }
};

export const setLastSyncTime = async (timestamp: string): Promise<void> => {
    try {
        await AsyncStorage.setItem(KEYS.LAST_SYNC, timestamp);
    } catch (error) {
        console.error('Failed to set last sync time:', error);
    }
};

// Clear all cache (for logout or debug)
export const clearAllCache = async (): Promise<void> => {
    try {
        await AsyncStorage.multiRemove([
            KEYS.NOTES_CACHE,
            KEYS.SYNC_QUEUE,
            KEYS.LAST_SYNC,
            KEYS.PENDING_COUNT,
        ]);
        console.log('✅ Cache cleared');
    } catch (error) {
        console.error('Failed to clear cache:', error);
    }
};

// Clear stuck drawing operations from sync queue
export const clearStuckDrawings = async (): Promise<number> => {
    try {
        const queue = await getSyncQueue();
        const originalLength = queue.length;

        // Remove all CREATE_DRAWING and DELETE_DRAWING operations
        const filtered = queue.filter(op =>
            op.type !== 'CREATE_DRAWING' && op.type !== 'DELETE_DRAWING'
        );

        await setSyncQueue(filtered);
        const removed = originalLength - filtered.length;

        console.log(`✅ Cleared ${removed} stuck drawing operation(s)`);
        return removed;
    } catch (error) {
        console.error('Failed to clear stuck drawings:', error);
        return 0;
    }
};

// Clear all failed operations (retry count >= MAX_RETRIES)
export const clearFailedOperations = async (): Promise<number> => {
    try {
        const queue = await getSyncQueue();
        const originalLength = queue.length;

        // Remove operations that have failed too many times
        const filtered = queue.filter(op => op.retryCount < 3);

        await setSyncQueue(filtered);
        const removed = originalLength - filtered.length;

        console.log(`✅ Cleared ${removed} failed operation(s)`);
        return removed;
    } catch (error) {
        console.error('Failed to clear failed operations:', error);
        return 0;
    }
};

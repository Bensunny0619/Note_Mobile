// React Native compatible UUID generator
const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

import api from './api';
import {
    getCachedNotes,
    setCachedNotes,
    addCachedNote,
    updateCachedNote,
    removeCachedNote,
    getCachedNoteById,
    enqueueOperation,
    CachedNote,
} from './storage';

let isOnlineGlobal = true;

export const setGlobalOnlineStatus = (online: boolean) => {
    isOnlineGlobal = online;
};

// Notes API
export const getNotes = async (searchQuery?: string, labelId?: number): Promise<any[]> => {
    if (isOnlineGlobal) {
        try {
            // Build query params
            const params: any = {};
            if (searchQuery) params.search = searchQuery;
            if (labelId) params.label_id = labelId;

            const response = await api.get('/notes', { params });
            const notes = response.data.data || response.data;

            // Cache the fresh data
            const cachedNotes: CachedNote[] = notes.map((note: any) => ({
                id: note.id,
                data: note,
                locallyModified: false,
                lastSyncedAt: new Date().toISOString(),
            }));
            await setCachedNotes(cachedNotes);

            return notes;
        } catch (error) {
            console.warn('Failed to fetch notes from server, falling back to cache:', error);
            return getCachedNotesData();
        }
    } else {
        console.log('📴 Offline: Loading notes from cache');
        return getCachedNotesData();
    }
};

const getCachedNotesData = async (): Promise<any[]> => {
    const cached = await getCachedNotes();
    return cached.map(c => c.data);
};

export const getNote = async (id: string | number): Promise<any> => {
    if (isOnlineGlobal && typeof id === 'number') {
        try {
            const response = await api.get(`/notes/${id}`);
            const note = response.data;

            // Update cache
            await updateCachedNote(id, {
                id: note.id,
                data: note,
                locallyModified: false,
                lastSyncedAt: new Date().toISOString(),
            });

            return note;
        } catch (error) {
            console.warn('Failed to fetch note from server, falling back to cache:', error);
            const cached = await getCachedNoteById(id);
            return cached?.data || null;
        }
    } else {
        console.log('📴 Offline: Loading note from cache');
        const cached = await getCachedNoteById(id);
        return cached?.data || null;
    }
};

export const createNote = async (payload: any): Promise<any> => {
    const tempId = `offline_${generateUUID()}`;
    const localNote = {
        id: tempId,
        ...payload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_pinned: false,
        is_archived: false,
        checklist_items: [],
        labels: [],
        images: [],
        reminder: null,
    };

    // Add to cache immediately (optimistic UI)
    await addCachedNote({
        id: tempId,
        data: localNote,
        locallyModified: true,
    });

    console.log('📝 Note created locally:', tempId);

    // Queue for sync
    await enqueueOperation({
        type: 'CREATE',
        resourceType: 'note',
        resourceId: tempId,
        payload,
    });

    return localNote;
};

export const updateNote = async (id: string | number, payload: any): Promise<any> => {
    // Update cache immediately
    const cached = await getCachedNoteById(id);
    if (cached) {
        const updatedData = {
            ...cached.data,
            ...payload,
            updated_at: new Date().toISOString(),
        };

        await updateCachedNote(id, {
            data: updatedData,
            locallyModified: true,
        });

        console.log('✏️ Note updated locally:', id);
    }

    // Queue for sync
    await enqueueOperation({
        type: 'UPDATE',
        resourceType: 'note',
        resourceId: id,
        payload,
    });

    return cached?.data;
};

export const deleteNote = async (id: string | number): Promise<void> => {
    // Remove from cache immediately
    await removeCachedNote(id);

    console.log('🗑️ Note deleted locally:', id);

    // Queue for sync (only if it's a server ID)
    await enqueueOperation({
        type: 'DELETE',
        resourceType: 'note',
        resourceId: id,
        payload: {},
    });
};

// Image operations
export const uploadImage = async (noteId: string | number, formData: any): Promise<void> => {
    await enqueueOperation({
        type: 'UPLOAD_IMAGE',
        resourceType: 'image',
        resourceId: noteId,
        payload: { noteId, formData },
    });

    console.log('📷 Image upload queued for note:', noteId);
};

// Reminder operations
export const createReminder = async (noteId: string | number, remind_at: string): Promise<void> => {
    await enqueueOperation({
        type: 'CREATE_REMINDER',
        resourceType: 'reminder',
        resourceId: noteId,
        payload: { noteId, remind_at },
    });

    console.log('⏰ Reminder queued for note:', noteId);
};

export const deleteReminder = async (reminderId: number): Promise<void> => {
    await enqueueOperation({
        type: 'DELETE_REMINDER',
        resourceType: 'reminder',
        resourceId: reminderId,
        payload: { reminderId },
    });

    console.log('🔕 Reminder deletion queued:', reminderId);
};

// Label operations
export const attachLabel = async (noteId: string | number, labelId: number): Promise<void> => {
    await enqueueOperation({
        type: 'ATTACH_LABEL',
        resourceType: 'label',
        resourceId: noteId,
        payload: { noteId, labelId },
    });

    console.log('🏷️ Label attachment queued:', labelId, 'to note:', noteId);
};

export const detachLabel = async (noteId: string | number, labelId: number): Promise<void> => {
    await enqueueOperation({
        type: 'DETACH_LABEL',
        resourceType: 'label',
        resourceId: noteId,
        payload: { noteId, labelId },
    });

    console.log('🏷️ Label detachment queued:', labelId, 'from note:', noteId);
};

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
    getSyncQueue,
    setSyncQueue,
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

            console.log(`🌐 Fetched ${notes.length} notes from server`);

            // Cache the fresh data
            // Cache the fresh data, but preserve locally modified notes
            const currentCached = await getCachedNotes();
            const localOnlyNotes = currentCached.filter(n => n.locallyModified);

            const serverNotesMapped: CachedNote[] = notes.map((note: any) => ({
                id: note.id,
                data: note,
                locallyModified: false,
                lastSyncedAt: new Date().toISOString(),
            }));

            // Merge: Start with server notes
            const mergedNotes = [...serverNotesMapped];

            // Apply local modifications/creations on top
            localOnlyNotes.forEach(localNote => {
                const index = mergedNotes.findIndex(n => n.id === localNote.id);
                if (index !== -1) {
                    // Replace server version with local version to keep unsynced edits visible
                    mergedNotes[index] = localNote;
                } else {
                    // Append new locally created notes (e.g. offline_xxxx)
                    mergedNotes.unshift(localNote); // Add to top
                }
            });

            await setCachedNotes(mergedNotes);

            return mergedNotes.map(n => n.data);
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
    console.log(`💾 Retrieved ${cached.length} notes from cache`);
    const notes = cached.map(c => c.data);
    console.log('First cached note:', notes[0]);
    return notes;
};

export const getNote = async (id: string | number): Promise<any | null> => {
    try {
        if (isOnlineGlobal) { // Changed from isOnline
            const response = await api.get(`/notes/${id}`);

            // Cache the fetched note
            await addCachedNote({
                id: response.data.id,
                data: response.data,
                locallyModified: false,
            });

            return response.data;
        } else {
            const cached = await getCachedNoteById(id);
            return cached ? cached.data : null;
        }
    } catch (error) {
        console.warn('Failed to fetch note from server, falling back to cache:', error); // Changed from console.log
        const cached = await getCachedNoteById(id);

        // If we have a cached note with an offline ID, check if it's been synced
        if (cached && cached.data && typeof cached.data.id === 'string' && cached.data.id.startsWith('offline_')) {
            // Check if there's a synced version with a real ID
            const allCached = await getCachedNotes();
            const syncedNote = allCached.find(n =>
                typeof n.data.id === 'number' &&
                n.data.title === cached.data.title &&
                n.data.content === cached.data.content &&
                Math.abs(new Date(n.data.created_at).getTime() - new Date(cached.data.created_at).getTime()) < 5000
            );

            if (syncedNote) {
                console.log('🔄 Found synced version of offline note:', cached.data.id, '→', syncedNote.data.id);
                return syncedNote.data;
            }
        }

        return cached ? cached.data : null;
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

    // Extract valid backend fields and attachments
    const { audio_uri, drawing_uri, ...noteData } = payload;

    // Add to cache immediately (optimistic UI)
    // localNote already contains full payload (including audio/drawing) for offline view
    await addCachedNote({
        id: tempId,
        data: localNote,
        locallyModified: true,
    });

    console.log('📝 Note created locally:', tempId);

    // 1. Enqueue Note Creation (Sanitized payload)
    // Queue for sync
    await enqueueOperation({
        type: 'CREATE',
        resourceType: 'note',
        resourceId: tempId,
        payload: noteData,
    });

    // 2. Enqueue Audio Upload if present
    if (audio_uri) {
        await enqueueOperation({
            type: 'CREATE_AUDIO',
            resourceType: 'audio',
            resourceId: tempId,
            payload: { noteId: tempId, audio_uri },
        });
        console.log('🎤 Audio upload queued for note:', tempId);
    }

    // 3. Enqueue Drawing Save if present
    if (drawing_uri) {
        await enqueueOperation({
            type: 'CREATE_DRAWING',
            resourceType: 'drawing',
            resourceId: tempId,
            payload: { noteId: tempId, drawing_uri },
        });
        console.log('✏️ Drawing save queued for note:', tempId);
    }

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

    const idStr = id.toString();
    if (idStr.startsWith('offline_')) {
        // If it's an offline note that was never synced, we MUST remove its pending 
        // creation logic from the queue (and any attachments) instead of sending DELETE
        try {
            const queue = await getSyncQueue();
            const filteredQueue = queue.filter(op => {
                const isTargetNote = op.resourceId === id; // Op targeting this note
                const isRelatedAttachment = op.payload && op.payload.noteId === id; // Op belonging to this note
                return !isTargetNote && !isRelatedAttachment;
            });

            if (queue.length !== filteredQueue.length) {
                await setSyncQueue(filteredQueue);
                console.log('🧹 Removed pending operations for offline note:', id);
            }
        } catch (e) {
            console.error('Error cleaning up offline note from queue:', e);
        }
        return;
    }

    // Queue for sync (only if it's a server ID)
    await enqueueOperation({
        type: 'DELETE',
        resourceType: 'note',
        resourceId: id,
        payload: {},
    });
};

// Image operations
export const uploadImage = async (noteId: string | number, imageFile: { uri: string; name: string; type: string }): Promise<void> => {
    await enqueueOperation({
        type: 'UPLOAD_IMAGE',
        resourceType: 'image',
        resourceId: noteId,
        payload: { noteId, imageFile },
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

// Checklist operations
export const createChecklistItem = async (noteId: string | number, payload: { text: string; is_completed: boolean }): Promise<void> => {
    await enqueueOperation({
        type: 'CREATE_CHECKLIST',
        resourceType: 'checklist',
        resourceId: noteId,
        payload: { noteId, ...payload },
    });

    console.log('✅ Checklist item queued for note:', noteId);
};

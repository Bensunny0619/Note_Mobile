import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getCachedNotes } from './storage';

export interface ExportResult {
    success: boolean;
    message: string;
    filePath?: string;
}

/**
 * Export all notes as JSON with full metadata
 */
export const exportNotesAsJSON = async (): Promise<ExportResult> => {
    try {
        const cachedNotes = await getCachedNotes();

        if (cachedNotes.length === 0) {
            return {
                success: false,
                message: 'No notes to export'
            };
        }

        // Prepare export data with metadata
        const exportData = {
            exportDate: new Date().toISOString(),
            appVersion: '1.0.0',
            totalNotes: cachedNotes.length,
            notes: cachedNotes.map(cached => ({
                ...cached.data,
                // Add export metadata
                _exportMetadata: {
                    locallyModified: cached.locallyModified,
                    lastSyncedAt: cached.lastSyncedAt
                }
            }))
        };

        // Create filename with timestamp
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `homa_notes_export_${timestamp}.json`;

        // Create file using new API
        const file = new File(Paths.document, filename);
        await file.write(JSON.stringify(exportData, null, 2));

        // Share the file
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
            await Sharing.shareAsync(file.uri, {
                mimeType: 'application/json',
                dialogTitle: 'Export Notes as JSON',
                UTI: 'public.json'
            });
        }

        return {
            success: true,
            message: `Successfully exported ${cachedNotes.length} note${cachedNotes.length !== 1 ? 's' : ''}`,
            filePath: file.uri
        };
    } catch (error) {
        console.error('Error exporting notes as JSON:', error);
        return {
            success: false,
            message: 'Failed to export notes. Please try again.'
        };
    }
};

/**
 * Export all notes as plain text in a human-readable format
 */
export const exportNotesAsText = async (): Promise<ExportResult> => {
    try {
        const cachedNotes = await getCachedNotes();

        if (cachedNotes.length === 0) {
            return {
                success: false,
                message: 'No notes to export'
            };
        }

        // Build text content
        let textContent = `HOMA NOTES EXPORT\n`;
        textContent += `Export Date: ${new Date().toLocaleString()}\n`;
        textContent += `Total Notes: ${cachedNotes.length}\n`;
        textContent += `${'='.repeat(60)}\n\n`;

        cachedNotes.forEach((cached, index) => {
            const note = cached.data;

            // Note header
            textContent += `[${index + 1}] ${note.title || 'Untitled Note'}\n`;
            textContent += `${'-'.repeat(60)}\n`;

            // Created date
            if (note.created_at) {
                textContent += `Created: ${new Date(note.created_at).toLocaleString()}\n`;
            }

            // Updated date
            if (note.updated_at && note.updated_at !== note.created_at) {
                textContent += `Updated: ${new Date(note.updated_at).toLocaleString()}\n`;
            }

            // Status flags
            const flags = [];
            if (note.is_pinned) flags.push('📌 Pinned');
            if (note.is_archived) flags.push('📦 Archived');
            if (flags.length > 0) {
                textContent += `Status: ${flags.join(', ')}\n`;
            }

            // Labels
            if (note.labels && note.labels.length > 0) {
                const labelNames = note.labels.map((l: any) => `#${l.name}`).join(' ');
                textContent += `Labels: ${labelNames}\n`;
            }

            // Reminder
            if (note.reminder) {
                textContent += `Reminder: ${new Date(note.reminder.remind_at).toLocaleString()}\n`;
            }

            textContent += `\n`;

            // Content
            if (note.content) {
                textContent += `${note.content}\n\n`;
            }

            // Checklist items
            if (note.checklist_items && note.checklist_items.length > 0) {
                textContent += `Checklist:\n`;
                note.checklist_items.forEach((item: any) => {
                    const checkbox = item.is_completed ? '☑' : '☐';
                    textContent += `  ${checkbox} ${item.text}\n`;
                });
                textContent += `\n`;
            }

            // Attachments summary
            const attachments = [];
            if (note.images && note.images.length > 0) {
                attachments.push(`${note.images.length} image${note.images.length !== 1 ? 's' : ''}`);
            }
            if (note.audio_recordings && note.audio_recordings.length > 0) {
                attachments.push(`${note.audio_recordings.length} audio recording${note.audio_recordings.length !== 1 ? 's' : ''}`);
            }
            if (note.drawings && note.drawings.length > 0) {
                attachments.push(`${note.drawings.length} drawing${note.drawings.length !== 1 ? 's' : ''}`);
            }
            if (note.audio_uri) {
                attachments.push('1 local audio');
            }
            if (note.drawing_uri) {
                attachments.push('1 local drawing');
            }

            if (attachments.length > 0) {
                textContent += `Attachments: ${attachments.join(', ')}\n`;
            }

            textContent += `\n${'='.repeat(60)}\n\n`;
        });

        // Footer
        textContent += `End of export - ${cachedNotes.length} note${cachedNotes.length !== 1 ? 's' : ''} total\n`;
        textContent += `Exported from Homa Notes v1.0.0\n`;

        // Create filename with timestamp
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `homa_notes_export_${timestamp}.txt`;

        // Create file using new API
        const file = new File(Paths.document, filename);
        await file.write(textContent);

        // Share the file
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
            await Sharing.shareAsync(file.uri, {
                mimeType: 'text/plain',
                dialogTitle: 'Export Notes as Text',
                UTI: 'public.plain-text'
            });
        }

        return {
            success: true,
            message: `Successfully exported ${cachedNotes.length} note${cachedNotes.length !== 1 ? 's' : ''}`,
            filePath: file.uri
        };
    } catch (error) {
        console.error('Error exporting notes as text:', error);
        return {
            success: false,
            message: 'Failed to export notes. Please try again.'
        };
    }
};

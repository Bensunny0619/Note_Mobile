/**
 * Mock implementation of notification service for Web.
 */
export const scheduleNoteReminder = async (
    noteId: string | number,
    title: string,
    content: string,
    date: Date
) => {
    console.log(`[WEB MOCK] Reminder for note ${noteId} scheduled at ${date.toLocaleString()}`);
    return null;
};

export const cancelNoteReminder = async (noteId: string | number) => {
    console.log(`[WEB MOCK] Reminder for note ${noteId} cancelled`);
};

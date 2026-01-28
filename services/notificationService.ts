import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Schedules a local notification for a note reminder.
 * @param noteId The ID of the note
 * @param title The title of the note
 * @param content The content of the note
 * @param date The date and time to trigger the notification
 */
export const scheduleNoteReminder = async (
    noteId: string | number,
    title: string,
    content: string,
    date: Date
) => {
    // 1. Cancel any existing notifications for this note first (to avoid duplicates)
    await cancelNoteReminder(noteId);

    // 2. Don't schedule if date is in the past
    if (date.getTime() <= Date.now()) {
        console.warn('Cannot schedule reminder in the past');
        return null;
    }

    try {
        const identifier = await Notifications.scheduleNotificationAsync({
            content: {
                title: `Reminder: ${title || 'Note'}`,
                body: content ? content.substring(0, 100) : 'Tap to view your note',
                data: { noteId },
                sound: true,
                priority: Notifications.AndroidNotificationPriority.MAX,
            },
            trigger: { date: date, type: 'date' } as any,
        });

        console.log(`🔔 Scheduled notification for note ${noteId} at ${date.toLocaleString()}`);
        return identifier;
    } catch (error) {
        console.error('Error scheduling notification:', error);
        return null;
    }
};

/**
 * Cancels a scheduled notification for a specific note.
 * Since we don't store notification IDs persistently, 
 * we find them by looking through scheduled notifications' data.
 * @param noteId The ID of the note
 */
export const cancelNoteReminder = async (noteId: string | number) => {
    try {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        for (const notification of scheduled) {
            if (notification.content.data && notification.content.data.noteId === noteId) {
                await Notifications.cancelScheduledNotificationAsync(notification.identifier);
                console.log(`🔕 Cancelled notification for note ${noteId}`);
            }
        }
    } catch (error) {
        console.error('Error canceling notification:', error);
    }
};

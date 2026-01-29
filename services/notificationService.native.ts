import { Platform } from 'react-native';

/**
 * Mock implementation of notification service for Expo Go SDK 54 compatibility.
 * expo-notifications is removed from Expo Go Android, so we no-op here.
 */
export const scheduleNoteReminder = async (
    noteId: string | number,
    title: string,
    content: string,
    date: Date
) => {
    console.log(`[MOCK] Reminder for note ${noteId} scheduled at ${date.toLocaleString()}`);
    return null;
};

export const cancelNoteReminder = async (noteId: string | number) => {
    console.log(`[MOCK] Reminder for note ${noteId} cancelled`);
};

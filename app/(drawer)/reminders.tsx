import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { Feather } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import * as offlineApi from '../../services/offlineApi';
import NoteCard from '../../components/NoteCard';

export default function Reminders() {
    const { isDarkMode } = useTheme();
    const router = useRouter();
    const [notes, setNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchReminders = useCallback(async () => {
        try {
            const allNotes = await offlineApi.getNotes();
            // Filter notes that have reminders
            const notesWithReminders = allNotes.filter(note => note.reminder);
            setNotes(notesWithReminders);
        } catch (error) {
            console.error('Error fetching reminders:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchReminders();
        }, [fetchReminders])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchReminders();
    };

    const handleNotePress = (note: any) => {
        router.push(`/notes/edit/${note.id}`);
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366f1" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
            <View style={styles.header}>
                <Text style={[styles.headerTitle, isDarkMode && styles.textDark]}>Reminders</Text>
                <Text style={[styles.headerSubtitle, isDarkMode && styles.subtitleDark]}>
                    {notes.length} {notes.length === 1 ? 'reminder' : 'reminders'}
                </Text>
            </View>

            {notes.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Feather name="bell" size={64} color={isDarkMode ? "#94a3b8" : "#cbd5e1"} />
                    <Text style={[styles.emptyTitle, isDarkMode && styles.textDark]}>No Reminders</Text>
                    <Text style={[styles.emptySubtitle, isDarkMode && styles.subtitleDark]}>
                        Notes with reminders will appear here
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={notes}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <NoteCard
                            note={item}
                            onPress={() => handleNotePress(item)}
                            showReminder={true}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    containerDark: {
        backgroundColor: '#0f172a',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        padding: 20,
        paddingBottom: 12,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#6B7280',
    },
    textDark: {
        color: '#f8fafc',
    },
    subtitleDark: {
        color: '#94a3b8',
    },
    listContent: {
        padding: 16,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1F2937',
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 8,
        textAlign: 'center',
    },
});

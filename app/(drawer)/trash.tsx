import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { Feather } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import * as offlineApi from '../../services/offlineApi';
import NoteCard from '../../components/NoteCard';

export default function Trash() {
    const { isDarkMode } = useTheme();
    const router = useRouter();
    const [notes, setNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchTrashedNotes = useCallback(async () => {
        try {
            const allNotes = await offlineApi.getNotes();
            // Filter deleted notes (you'll need to add is_deleted field to your backend)
            // For now, showing empty as we don't have deleted notes in the current schema
            const trashedNotes = allNotes.filter(note => (note as any).is_deleted);
            setNotes(trashedNotes);
        } catch (error) {
            console.error('Error fetching trashed notes:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchTrashedNotes();
        }, [fetchTrashedNotes])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchTrashedNotes();
    };

    const handleRestore = async (note: any) => {
        Alert.alert(
            'Restore Note',
            'Do you want to restore this note?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Restore',
                    onPress: async () => {
                        try {
                            // Implement restore logic here
                            await offlineApi.updateNote(note.id, { is_deleted: false });
                            fetchTrashedNotes();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to restore note');
                        }
                    }
                }
            ]
        );
    };

    const handlePermanentDelete = async (note: any) => {
        Alert.alert(
            'Delete Permanently',
            'This note will be deleted permanently. This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await offlineApi.deleteNote(note.id);
                            fetchTrashedNotes();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete note');
                        }
                    }
                }
            ]
        );
    };

    const handleClearTrash = () => {
        if (notes.length === 0) return;
        Alert.alert(
            'Empty Trash',
            'All notes in Trash will be permanently deleted. This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Empty Trash',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            for (const note of notes) {
                                await offlineApi.deleteNote(note.id);
                            }
                            fetchTrashedNotes();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to empty trash');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
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
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                        <Text style={[styles.headerTitle, isDarkMode && styles.textDark]}>Trash</Text>
                        <Text style={[styles.headerSubtitle, isDarkMode && styles.subtitleDark]}>
                            {notes.length} {notes.length === 1 ? 'note' : 'notes'}
                        </Text>
                    </View>
                    {notes.length > 0 && (
                        <TouchableOpacity onPress={handleClearTrash} style={styles.emptyTrashButton}>
                            <Text style={styles.emptyTrashText}>Empty Trash</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {notes.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Feather name="trash-2" size={64} color={isDarkMode ? "#94a3b8" : "#cbd5e1"} />
                    <Text style={[styles.emptyTitle, isDarkMode && styles.textDark]}>Trash is Empty</Text>
                    <Text style={[styles.emptySubtitle, isDarkMode && styles.subtitleDark]}>
                        Deleted notes will appear here
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={notes}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <View style={styles.noteContainer}>
                            <NoteCard
                                note={item}
                                onPress={() => { }}
                            />
                            <View style={styles.actionButtons}>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.restoreButton]}
                                    onPress={() => handleRestore(item)}
                                >
                                    <Feather name="rotate-ccw" size={16} color="#6366f1" />
                                    <Text style={styles.restoreText}>Restore</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.deleteButton]}
                                    onPress={() => handlePermanentDelete(item)}
                                >
                                    <Feather name="trash-2" size={16} color="#EF4444" />
                                    <Text style={styles.deleteText}>Delete Forever</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
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
    noteContainer: {
        marginBottom: 16,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
    },
    restoreButton: {
        backgroundColor: '#EEF2FF',
    },
    deleteButton: {
        backgroundColor: '#FEF2F2',
    },
    restoreText: {
        color: '#6366f1',
        fontWeight: '600',
        fontSize: 14,
    },
    deleteText: {
        color: '#EF4444',
        fontWeight: '600',
        fontSize: 14,
    },
    emptyTrashButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    emptyTrashText: {
        color: '#EF4444',
        fontWeight: '700',
        fontSize: 13,
    },
});

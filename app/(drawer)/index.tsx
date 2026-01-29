import React, { useEffect, useState, useCallback } from 'react';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    StyleSheet,
    TextInput,
    Dimensions,
    Alert,
    Share,
    Modal,
    TouchableWithoutFeedback,
    ScrollView,
    Image as NoteImage,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import * as offlineApi from '../../services/offlineApi';
import { useNetwork } from '../../context/NetworkContext';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useLabels } from '../../context/LabelContext';
import { useTheme } from '../../context/ThemeContext';
import * as notificationService from '../../services/notificationService';
import { useAudio } from '../../context/AudioContext';
import CreationFab from '../../components/CreationFab';

const { width, height } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 60) / 2;

type Note = {
    id: number | string;
    title: string;
    content: string;
    color: string;
    created_at: string;
    is_pinned: boolean;
    is_archived: boolean;
    checklist_items: any[];
    labels: any[];
    images: any[];
    audio_recordings: any[];
    drawings: any[];
    reminder?: any; // Added missing reminder type
};

export default function NotesScreen() {
    const { user, logout } = useAuth();
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLabelId, setSelectedLabelId] = useState<number | null>(null);
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [selectedNoteIds, setSelectedNoteIds] = useState<(string | number)[]>([]);
    const [filterType, setFilterType] = useState<string | null>(null);
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const { labels: allLabels } = useLabels();
    const { isDarkMode, colors } = useTheme();
    const { isOnline, pendingCount, triggerSync, lastSync } = useNetwork();
    const { playAudio, isPlaying, currentUri } = useAudio();
    const router = useRouter();
    const navigation = useNavigation();
    const { label: filterLabel } = useLocalSearchParams();

    const fetchNotes = useCallback(async () => {
        try {
            console.log("--- FETCHING NOTES ---");
            const allNotes = await offlineApi.getNotes();

            let filtered = allNotes;
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                filtered = filtered.filter(note =>
                    note.title?.toLowerCase().includes(query) ||
                    note.content?.toLowerCase().includes(query)
                );
            }

            // Apply drawer label filter if present
            if (filterLabel) {
                filtered = filtered.filter(note =>
                    note.labels?.some((l: any) => l.name === filterLabel)
                );
            }

            // Exclude archived and deleted notes from the main list unless explicitly filtered (not handled here)
            const activeNotes = filtered.filter(note => !note.is_archived && !note.is_deleted);

            console.log(`📋 Fetched ${activeNotes.length} notes from cache/server`);
            setNotes(activeNotes);
        } catch (error) {
            console.error('Error fetching notes:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [searchQuery, filterLabel]);

    useEffect(() => {
        fetchNotes();
        // lastSync added to trigger refetch on real-time updates or sync completion
    }, [fetchNotes]);

    useFocusEffect(
        useCallback(() => {
            fetchNotes();
        }, [fetchNotes])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotes();
    };

    const toggleNoteSelection = (noteId: string | number) => {
        setSelectedNoteIds(prev => {
            if (prev.includes(noteId)) {
                return prev.filter(id => id !== noteId);
            } else {
                return [...prev, noteId];
            }
        });
    };

    const handleLongPress = (note: Note) => {
        toggleNoteSelection(note.id);
    };

    const closeMenu = () => {
        setIsMenuVisible(false);
        setSelectedNote(null);
    };

    const togglePin = async () => {
        if (!selectedNote) return;
        const noteId = selectedNote.id;
        const currentStatus = selectedNote.is_pinned;
        closeMenu();
        try {
            if (currentStatus) {
                await offlineApi.unpinNote(noteId);
            } else {
                await offlineApi.pinNote(noteId);
            }
            if (isOnline) triggerSync();
            fetchNotes();
        } catch (error) {
            Alert.alert('Error', 'Failed to update pin status');
        }
    };

    const toggleArchive = async () => {
        if (!selectedNote) return;
        const noteId = selectedNote.id;
        const currentStatus = selectedNote.is_archived;
        closeMenu();
        try {
            if (currentStatus) {
                await offlineApi.unarchiveNote(noteId);
            } else {
                await offlineApi.archiveNote(noteId);
            }
            if (isOnline) triggerSync();
            fetchNotes();
        } catch (error) {
            Alert.alert('Error', 'Failed to update archive status');
        }
    };

    const handleShare = async () => {
        if (!selectedNote) return;
        const note = selectedNote;
        closeMenu();
        try {
            let shareMessage = `${note.title}\n\n`;
            if (note.content) {
                shareMessage += `${note.content}\n\n`;
            }

            if (note.checklist_items && note.checklist_items.length > 0) {
                const checklistText = note.checklist_items
                    .map((item: any) => `${item.is_completed ? '☑' : '☐'} ${item.text}`)
                    .join('\n');
                shareMessage += `Checklist:\n${checklistText}\n\n`;
            }

            if (note.labels && note.labels.length > 0) {
                const labelText = note.labels.map((l: any) => `#${l.name}`).join(' ');
                shareMessage += `Labels: ${labelText}`;
            }

            await Share.share({
                message: shareMessage.trim(),
                title: note.title
            });
        } catch (error) {
            console.error('Share error:', error);
        }
    };

    const confirmDelete = () => {
        if (!selectedNote) return;
        const noteId = selectedNote.id;
        closeMenu();
        Alert.alert(
            'Delete Note',
            'Are you sure you want to delete this note?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await offlineApi.deleteNote(noteId);
                            await notificationService.cancelNoteReminder(noteId);
                            if (isOnline) triggerSync();
                            fetchNotes();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete note');
                        }
                    }
                }
            ]
        );
    };

    const handleBatchDelete = () => {
        if (selectedNoteIds.length === 0) return;
        Alert.alert(
            'Delete Notes',
            `Are you sure you want to delete ${selectedNoteIds.length} notes?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            for (const id of selectedNoteIds) {
                                await offlineApi.deleteNote(id);
                                await notificationService.cancelNoteReminder(id);
                            }
                            if (isOnline) triggerSync();
                            setSelectedNoteIds([]);
                            fetchNotes();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete notes');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleBatchArchive = async () => {
        if (selectedNoteIds.length === 0) return;
        try {
            setLoading(true);
            for (const id of selectedNoteIds) {
                await offlineApi.archiveNote(id);
            }
            if (isOnline) triggerSync();
            setSelectedNoteIds([]);
            fetchNotes();
        } catch (error) {
            Alert.alert('Error', 'Failed to archive notes');
        } finally {
            setLoading(false);
        }
    };

    const handleBatchPin = async () => {
        if (selectedNoteIds.length === 0) return;
        try {
            setLoading(true);
            // We'll pin all of them for simplicity, or we could toggle based on the first one
            // Let's toggle based on the first note's status
            const firstNote = notes.find(n => n.id === selectedNoteIds[0]);
            const shouldPin = !firstNote?.is_pinned;

            for (const id of selectedNoteIds) {
                if (shouldPin) {
                    await offlineApi.pinNote(id);
                } else {
                    await offlineApi.unpinNote(id);
                }
            }
            if (isOnline) triggerSync();
            setSelectedNoteIds([]);
            fetchNotes();
        } catch (error) {
            Alert.alert('Error', 'Failed to update pin status for notes');
        } finally {
            setLoading(false);
        }
    };

    const handleBatchShare = async () => {
        if (selectedNoteIds.length === 0) return;
        try {
            const selectedNotes = notes.filter(n => selectedNoteIds.includes(n.id));
            let combinedMessage = '';

            for (const note of selectedNotes) {
                combinedMessage += `--- ${note.title || 'Untitled Note'} ---\n`;
                combinedMessage += `${note.content || ''}\n`;
                if (note.checklist_items?.length > 0) {
                    combinedMessage += note.checklist_items
                        .map((item: any) => `${item.is_completed ? '☑' : '☐'} ${item.text}`)
                        .join('\n') + '\n';
                }
                combinedMessage += '\n';
            }

            await Share.share({
                message: combinedMessage.trim(),
            });
        } catch (error) {
            console.error('Batch share error:', error);
        }
    };

    const filteredNotes = (notes || []).filter(note => {
        const matchesSearch = (note.title?.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (note.content?.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesLabel = selectedLabelId
            ? note.labels?.some((l: any) => l.id === selectedLabelId)
            : true;

        let matchesType = true;
        if (filterType === 'audio') {
            matchesType = (note.audio_recordings?.length > 0) || !!(note as any).audio_uri;
        } else if (filterType === 'drawing') {
            matchesType = (note.drawings?.length > 0) || !!(note as any).drawing_uri;
        } else if (filterType === 'image') {
            matchesType = (note.images?.length > 0);
        } else if (filterType === 'checklist') {
            matchesType = (note.checklist_items?.length > 0);
        }

        return matchesSearch && matchesLabel && matchesType;
    });

    const renderNote = ({ item }: { item: any }) => {
        const isSelected = selectedNoteIds.includes(item.id);

        // Merge images and drawings for preview
        const allVisuals = [
            ...(item.images || []).map((img: any) => ({ ...img, uri: img.image_url, type: 'image' })),
            ...(item.drawings || []).map((drw: any) => ({ ...drw, uri: drw.drawing_url, type: 'drawing', id: `d-${drw.id}` }))
        ];

        // Handle offline/local attachments
        if (item.drawing_uri) {
            allVisuals.push({ id: 'local-drawing', uri: item.drawing_uri, type: 'drawing' });
        }

        return (
            <TouchableOpacity
                style={[
                    styles.noteCard,
                    { backgroundColor: item.color || (isDarkMode ? '#1e293b' : '#FFFFFF') },
                    isDarkMode && styles.noteCardDark,
                    isSelected && { borderColor: '#6366f1', borderWidth: 2 }
                ]}
                onPress={() => {
                    if (selectedNoteIds.length > 0) {
                        toggleNoteSelection(item.id);
                    } else {
                        router.push(`/notes/edit/${item.id}` as any);
                    }
                }}
                onLongPress={() => handleLongPress(item)}
                activeOpacity={0.7}
            >
                {isSelected && (
                    <View style={styles.selectionOverlay}>
                        <Feather name="check-circle" size={18} color={colors.primary} />
                    </View>
                )}
                <View style={styles.noteHeaderRow}>
                    <Text style={[styles.noteTitle, isDarkMode && styles.textDark]} numberOfLines={2}>{item.title}</Text>
                    {item.is_pinned && <MaterialCommunityIcons name="pin" size={16} color="#6366f1" style={{ marginLeft: 8 }} />}
                </View>

                {/* Audio Recordings Preview */}
                {((item.audio_recordings?.length > 0) || item.audio_uri) && (
                    <View style={styles.audioPreviewContainer}>
                        {(item.audio_recordings?.length > 0 ? item.audio_recordings : [{ id: 'local', uri: item.audio_uri }]).slice(0, 1).map((audio: any) => {
                            const audioUri = audio.audio_url || audio.file_url || audio.uri;
                            const isThisPlaying = isPlaying && currentUri === audioUri;
                            return (
                                <TouchableOpacity
                                    key={audio.id}
                                    style={[styles.audioPill, isDarkMode && styles.audioPillDark]}
                                    onPress={(e) => {
                                        e.stopPropagation(); // Prevent opening note
                                        if (audioUri) playAudio(audioUri, {
                                            noteId: item.id,
                                            title: item.title || 'Audio Note',
                                            duration: audio.duration ? audio.duration * 1000 : undefined
                                        });
                                    }}
                                >
                                    <Feather name={isThisPlaying ? "pause" : "play"} size={12} color="#6366f1" />
                                    <Text style={[styles.audioPillText, isDarkMode && { color: '#818cf8' }]}>
                                        Audio {item.audio_recordings?.length > 1 ? `(+${item.audio_recordings.length - 1})` : ''}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {/* Visuals (Images + Drawings) */}
                {allVisuals.length > 0 && (
                    <View style={styles.noteImagesPreview}>
                        {allVisuals.slice(0, 3).map((visual: any, index: number) => (
                            <NoteImage
                                key={visual.id}
                                source={{ uri: visual.uri }}
                                style={[
                                    styles.notePreviewImage,
                                    index === 0 && allVisuals.length === 1 && { width: '100%', height: 120 },
                                    visual.type === 'drawing' && { backgroundColor: '#FFFFFF' } // Drawing needs white bg usually
                                ]}
                                resizeMode={visual.type === 'drawing' ? 'contain' : 'cover'}
                            />
                        ))}
                        {allVisuals.length > 3 && (
                            <View style={styles.moreImagesIndicator}>
                                <Text style={styles.moreImagesText}>+{allVisuals.length - 3}</Text>
                            </View>
                        )}
                    </View>
                )}

                {item.content ? (
                    <Text style={[styles.noteContent, isDarkMode && styles.textDarkSecondary]} numberOfLines={(item.checklist_items?.length > 0 || allVisuals.length > 0) ? 2 : 5}>
                        {item.content}
                    </Text>
                ) : null}

                {item.checklist_items?.length > 0 && (
                    <View style={styles.checklistPreview}>
                        {item.checklist_items.slice(0, 3).map((check: any) => (
                            <View key={check.id} style={styles.previewItem}>
                                <Feather
                                    name={check.is_completed ? "check-square" : "square"}
                                    size={12}
                                    color={check.is_completed ? "#6366f1" : "#9CA3AF"}
                                />
                                <Text
                                    style={[
                                        styles.previewText,
                                        isDarkMode && styles.textDarkSecondary,
                                        check.is_completed && styles.previewTextCompleted
                                    ]}
                                    numberOfLines={1}
                                >
                                    {check.text}
                                </Text>
                            </View>
                        ))}
                        {item.checklist_items.length > 3 && (
                            <Text style={styles.moreItemsText}>+ {item.checklist_items.length - 3} more</Text>
                        )}
                    </View>
                )}

                {item.labels?.length > 0 && (
                    <View style={styles.labelPreviewContainer}>
                        {item.labels.slice(0, 2).map((label: any) => (
                            <View key={label.id} style={[styles.miniLabelChip, isDarkMode && { backgroundColor: 'rgba(129, 140, 248, 0.1)', borderColor: 'rgba(129, 140, 248, 0.2)' }]}>
                                <Text style={[styles.miniLabelText, isDarkMode && { color: '#818cf8' }]} numberOfLines={1}>{label.name}</Text>
                            </View>
                        ))}
                        {item.labels.length > 2 && (
                            <Text style={[styles.miniMoreLabels, isDarkMode && styles.textDarkSecondary]}>+{item.labels.length - 2}</Text>
                        )}
                    </View>
                )}

                <View style={styles.noteFooter}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.noteDate, isDarkMode && styles.textDarkSecondary]}>
                            {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </Text>
                        {item.reminder && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 12 }}>
                                <Feather name="bell" size={12} color={isDarkMode ? "#818cf8" : "#6366f1"} />
                                <Text style={[styles.noteDate, { marginLeft: 4, color: isDarkMode ? "#818cf8" : "#6366f1" }]}>
                                    {new Date(item.reminder.remind_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                        )}
                    </View>
                    {item.is_archived && <Feather name="archive" size={14} color={isDarkMode ? "#94a3b8" : "#9CA3AF"} />}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>


            {/* Offline Banner */}
            {!isOnline && (
                <View style={styles.offlineBanner}>
                    <Feather name="wifi-off" size={16} color="#FFFFFF" />
                    <Text style={styles.offlineBannerText}>
                        Offline Mode • Changes will sync when online
                    </Text>
                </View>
            )}

            {/* Sync Status Indicator */}
            {isOnline && pendingCount > 0 && (
                <View style={styles.syncBanner}>
                    <ActivityIndicator size="small" color="#6366f1" />
                    <Text style={styles.syncBannerText}>
                        Syncing {pendingCount} change{pendingCount !== 1 ? 's' : ''}...
                    </Text>
                </View>
            )}

            {/* Selection Header or Search Header */}
            <View style={styles.headerContainer}>
                {selectedNoteIds.length > 0 ? (
                    <View style={[styles.floatingHeader, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                        <TouchableOpacity onPress={() => setSelectedNoteIds([])} style={styles.menuButton}>
                            <Feather name="x" size={24} color="#FFFFFF" />
                        </TouchableOpacity>

                        <Text style={{ flex: 1, fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginLeft: 8 }}>
                            {selectedNoteIds.length} selected
                        </Text>

                        <View style={{ flexDirection: 'row' }}>
                            <TouchableOpacity onPress={handleBatchPin} style={styles.toolbarAction}>
                                <MaterialCommunityIcons name="pin" size={22} color="#FFFFFF" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleBatchShare} style={styles.toolbarAction}>
                                <Feather name="share-2" size={22} color="#FFFFFF" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleBatchArchive} style={styles.toolbarAction}>
                                <Feather name="archive" size={22} color="#FFFFFF" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleBatchDelete} style={styles.toolbarAction}>
                                <Feather name="trash-2" size={22} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <View style={[styles.floatingHeader, isDarkMode && styles.floatingHeaderDark]}>
                        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={styles.menuButton}>
                            <Feather name="menu" size={24} color={isDarkMode ? "#E2E8F0" : "#5F6368"} />
                        </TouchableOpacity>

                        {filterLabel ? (
                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}>
                                <Text style={[{ flex: 1, fontSize: 16, fontWeight: '600' }, isDarkMode ? styles.textDark : { color: '#1F2937' }]} numberOfLines={1}>
                                    Label: {filterLabel}
                                </Text>
                                <TouchableOpacity onPress={() => router.setParams({ label: '' })}>
                                    <Feather name="x" size={20} color={isDarkMode ? "#94A3B8" : "#5F6368"} />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TextInput
                                style={[styles.headerSearchInput, isDarkMode && styles.textDark]}
                                placeholder="Search your notes"
                                placeholderTextColor={isDarkMode ? "#94A3B8" : "#5F6368"}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        )}

                        <TouchableOpacity onPress={logout} style={styles.profileButton}>
                            <View style={[styles.profileAvatar, { backgroundColor: '#A5B4FC' }]}>
                                <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>
                                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Label Filter Bar */}
            {allLabels.length > 0 && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.filterScroll}
                    contentContainerStyle={styles.filterContent}
                >
                    <TouchableOpacity
                        style={[
                            styles.filterChip,
                            selectedLabelId === null && styles.filterChipActive
                        ]}
                        onPress={() => setSelectedLabelId(null)}
                    >
                        <Text style={[
                            styles.filterChipText,
                            selectedLabelId === null && styles.filterChipTextActive
                        ]}>All</Text>
                    </TouchableOpacity>

                    {allLabels.map(label => (
                        <TouchableOpacity
                            key={label.id}
                            style={[
                                styles.filterChip,
                                selectedLabelId === label.id && styles.filterChipActive
                            ]}
                            onPress={() => setSelectedLabelId(label.id)}
                        >
                            <Text style={[
                                styles.filterChipText,
                                selectedLabelId === label.id && styles.filterChipTextActive
                            ]}>
                                {label.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}


            <View style={styles.content}>
                {loading && !refreshing ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color="#6366f1" />
                    </View>
                ) : (
                    <FlatList
                        data={filteredNotes}
                        renderItem={renderNote}
                        keyExtractor={(item) => item.id.toString()}
                        numColumns={2}
                        columnWrapperStyle={styles.columnWrapper}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <View style={[styles.emptyIconContainer, isDarkMode && styles.emptyIconContainerDark]}>
                                    <View style={styles.homaLogoSymbol}>
                                        <Text style={styles.homaLogoText}>H</Text>
                                    </View>
                                </View>
                                <Text style={[styles.emptyTitle, isDarkMode && styles.textDark]}>Nothing here yet</Text>
                                <Text style={[styles.emptySubtitle, isDarkMode && styles.textDarkSecondary]}>Tap the + button to create your first note</Text>
                            </View>
                        }
                    />
                )}
            </View>

            <CreationFab />

            {/* Premium Action Menu (Bottom Sheet) */}
            <Modal
                visible={isMenuVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={closeMenu}
            >
                <TouchableWithoutFeedback onPress={closeMenu}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={[styles.menuContent, isDarkMode && styles.menuContentDark]}>
                                <View style={styles.menuHeader}>
                                    <View style={[styles.menuHandle, isDarkMode && styles.menuHandleDark]} />
                                    <Text style={[styles.menuTitle, isDarkMode && styles.textDark]} numberOfLines={1}>
                                        {selectedNote?.title || 'Note Options'}
                                    </Text>
                                </View>

                                <View style={styles.menuOptions}>
                                    <TouchableOpacity style={styles.menuItem} onPress={togglePin}>
                                        <View style={[styles.menuIconContainer, { backgroundColor: isDarkMode ? 'rgba(99, 102, 241, 0.1)' : '#EEF2FF' }]}>
                                            <MaterialCommunityIcons name="pin" size={22} color="#6366f1" />
                                        </View>
                                        <Text style={[styles.menuItemText, isDarkMode && styles.menuItemTextDark]}>
                                            {selectedNote?.is_pinned ? 'Unpin note' : 'Pin note'}
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.menuItem} onPress={toggleArchive}>
                                        <View style={[styles.menuIconContainer, { backgroundColor: isDarkMode ? 'rgba(148, 163, 184, 0.1)' : '#F3F4F6' }]}>
                                            <Feather name="archive" size={20} color={isDarkMode ? "#94a3b8" : "#4B5563"} />
                                        </View>
                                        <Text style={[styles.menuItemText, isDarkMode && styles.menuItemTextDark]}>
                                            {selectedNote?.is_archived ? 'Remove from archive' : 'Archive note'}
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.menuItem} onPress={handleShare}>
                                        <View style={[styles.menuIconContainer, { backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.1)' : '#F0FDF4' }]}>
                                            <Feather name="share-2" size={20} color="#22C55E" />
                                        </View>
                                        <Text style={[styles.menuItemText, isDarkMode && styles.menuItemTextDark]}>Share note</Text>
                                    </TouchableOpacity>

                                    <View style={[styles.menuDivider, isDarkMode && styles.menuDividerDark]} />

                                    <TouchableOpacity style={styles.menuItem} onPress={confirmDelete}>
                                        <View style={[styles.menuIconContainer, { backgroundColor: '#FEF2F2' }]}>
                                            <Feather name="trash-2" size={20} color="#EF4444" />
                                        </View>
                                        <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Delete note</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </SafeAreaView >
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
    textDark: {
        color: '#f8fafc',
    },
    textDarkSecondary: {
        color: '#94a3b8',
    },
    avatarDark: {
        backgroundColor: '#1e293b',
    },
    noteCardDark: {
        backgroundColor: '#1e293b',
        borderColor: '#334155',
    },
    filterChipDark: {
        backgroundColor: '#1e293b',
        borderColor: '#334155',
    },
    filterChipActiveDark: {
        backgroundColor: '#312e81',
        borderColor: '#4338ca',
    },
    avatarTextDark: {
        color: '#818cf8',
    },
    emptyIconContainerDark: {
        backgroundColor: '#1e293b',
    },
    menuContentDark: {
        backgroundColor: '#0f172a',
    },
    menuHandleDark: {
        backgroundColor: '#334155',
    },
    menuItemTextDark: {
        color: '#f8fafc',
    },
    menuDividerDark: {
        backgroundColor: '#1e293b',
    },
    headerContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 4,
        zIndex: 10,
    },
    floatingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        height: 52,
        paddingHorizontal: 12,
        elevation: 3,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.15,
                shadowRadius: 2,
            },
            web: {
                boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.15)',
            }
        }),
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    floatingHeaderDark: {
        backgroundColor: '#1e293b',
        borderColor: '#334155',
    },
    menuButton: {
        padding: 8,
        marginRight: 4,
    },
    headerSearchInput: {
        flex: 1,
        fontSize: 16,
        paddingHorizontal: 8,
        color: '#1F2937',
    },
    profileButton: {
        padding: 4,
        marginLeft: 4,
    },
    profileAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        color: '#1F2937',
        fontWeight: '500',
    },
    offlineBanner: {
        backgroundColor: '#EF4444',
        padding: 8,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    offlineBannerText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    syncBanner: {
        backgroundColor: '#EEF2FF',
        padding: 8,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E7FF',
    },
    syncBannerText: {
        color: '#6366f1',
        fontSize: 12,
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContainer: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 110,
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    noteCard: {
        width: COLUMN_WIDTH,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        // No explicit shadow for flat clean look, or very subtle
    },
    noteHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    noteTitle: {
        flex: 1,
        fontSize: 17,
        fontWeight: '800',
        color: '#111827',
        lineHeight: 22,
    },
    noteContent: {
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 20,
        fontWeight: '400',
    },
    noteImagesPreview: {
        flexDirection: 'row',
        gap: 4,
        marginBottom: 12,
        borderRadius: 16,
        overflow: 'hidden',
    },
    notePreviewImage: {
        flex: 1,
        height: 80,
        borderRadius: 8,
    },
    moreImagesIndicator: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        top: 0,
        width: 30,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    moreImagesText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    moreItemsText: {
        fontSize: 10,
        color: '#9CA3AF',
        marginTop: 4,
        fontStyle: 'italic',
    },
    filterScroll: {
        marginTop: 8,
        marginBottom: 8,
        flexGrow: 0,
        height: 50, // Force height
    },
    filterContent: {
        paddingHorizontal: 16,
        paddingRight: 40,
        alignItems: 'center', // Standardize alignment
    },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        height: 38,
        justifyContent: 'center',
    },
    filterChipActive: {
        backgroundColor: '#EEF2FF',
        borderColor: '#C7D2FE',
    },
    filterChipText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#4B5563',
    },
    filterChipTextActive: {
        color: '#6366f1',
        fontWeight: '600',
    },
    labelPreviewContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 10,
        gap: 4,
    },
    miniLabelChip: {
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 12,
        borderWidth: 0.5,
        borderColor: 'rgba(99, 102, 241, 0.2)',
    },
    miniLabelText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#6366f1',
    },
    miniMoreLabels: {
        fontSize: 10,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    noteFooter: {
        marginTop: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    noteDate: {
        fontSize: 11,
        fontWeight: '700',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    checklistPreview: {
        marginTop: 10,
        gap: 4,
    },
    previewItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    previewText: {
        fontSize: 12,
        color: '#6B7280',
        flex: 1,
    },
    previewTextCompleted: {
        textDecorationLine: 'line-through',
        color: '#D1D5DB',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    homaLogoSymbol: {
        width: 60,
        height: 60,
        borderRadius: 18,
        backgroundColor: '#6366f1',
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ rotate: '45deg' }],
    },
    homaLogoText: {
        color: 'white',
        fontSize: 32,
        fontWeight: '900',
        transform: [{ rotate: '-45deg' }],
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 10,
    },
    emptySubtitle: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        paddingHorizontal: 40,
        lineHeight: 22,
    },
    fab: {
        position: 'absolute',
        right: 24,
        bottom: 24,
        width: 68,
        height: 68,
        borderRadius: 24,
        backgroundColor: '#6366f1',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 10,
        ...Platform.select({
            ios: {
                shadowColor: '#6366f1',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.4,
                shadowRadius: 16,
            },
            web: {
                boxShadow: '0px 6px 16px rgba(99, 102, 241, 0.4)',
            }
        }),
    },
    // Modal & Menu Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
    },
    menuContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingBottom: 40,
        maxHeight: height * 0.7,
    },
    menuHeader: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 20,
    },
    menuHandle: {
        width: 40,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: '#E5E7EB',
        marginBottom: 20,
    },
    menuTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#111827',
        paddingHorizontal: 24,
    },
    menuOptions: {
        paddingHorizontal: 16,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
    },
    menuIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    menuItemText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    menuDivider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: 8,
        marginHorizontal: 16,
    },
    audioPreviewContainer: {
        flexDirection: 'row',
        marginTop: 6,
        marginBottom: 2,
    },
    audioPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    audioPillDark: {
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
    },
    audioPillText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6366f1',
    },
    selectionOverlay: {
        position: 'absolute',
        top: -10,
        right: -10,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        zIndex: 10,
        elevation: 5,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
            },
            web: {
                boxShadow: '0px 2px 3.84px rgba(0, 0, 0, 0.25)',
            }
        }),
    },
    toolbarAction: {
        padding: 8,
        marginLeft: 4,
    },
});

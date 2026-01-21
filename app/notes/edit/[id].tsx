import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Share,
    Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../../services/api';
import * as offlineApi from '../../../services/offlineApi';
import { useNetwork } from '../../../context/NetworkContext';
import { useAudio } from '../../../context/AudioContext';
import { Feather } from '@expo/vector-icons';
import { useLabels } from '../../../context/LabelContext';
import { useTheme } from '../../../context/ThemeContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import AudioRecorder from '../../../components/AudioRecorder';
import DrawingCanvas from '../../../components/DrawingCanvas';

const COLORS = ['#FFFFFF', '#FECACA', '#FDE68A', '#A7F3D0', '#BFDBFE', '#DDD6FE', '#F5D0FE'];

type ChecklistItem = {
    id: string | number;
    content: string;
    is_completed: boolean;
};

type NoteImage = {
    id: number | string;
    uri: string;
};

export default function EditNote() {
    const { id } = useLocalSearchParams();
    const { labels: allLabels } = useLabels();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [color, setColor] = useState('#FFFFFF');
    const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
    const [selectedLabelIds, setSelectedLabelIds] = useState<number[]>([]);
    const [initialLabelIds, setInitialLabelIds] = useState<number[]>([]);
    const [newChecklistItem, setNewChecklistItem] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [deletedItemIds, setDeletedItemIds] = useState<(string | number)[]>([]);
    const [reminderDate, setReminderDate] = useState<Date | null>(null);
    const [reminderId, setReminderId] = useState<number | null>(null);
    const [repeatFrequency, setRepeatFrequency] = useState<'none' | 'daily' | 'weekly'>('none');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [selectedImages, setSelectedImages] = useState<NoteImage[]>([]);
    const [deletedImageIds, setDeletedImageIds] = useState<number[]>([]);
    const [audioRecordings, setAudioRecordings] = useState<any[]>([]);
    const [deletedAudioIds, setDeletedAudioIds] = useState<number[]>([]);
    const [newAudioUri, setNewAudioUri] = useState<string | null>(null);
    const [drawings, setDrawings] = useState<any[]>([]);
    const [deletedDrawingIds, setDeletedDrawingIds] = useState<number[]>([]);
    const [newDrawingUri, setNewDrawingUri] = useState<string | null>(null);
    const { isDarkMode } = useTheme();
    const { isOnline, triggerSync } = useNetwork();
    const { playAudio, isPlaying, currentUri } = useAudio();
    const router = useRouter();

    useEffect(() => {
        fetchNote();
    }, [id]);

    const fetchNote = async () => {
        try {
            // Handle ID type coercion (Expo Router returns strings)
            const rawId = Array.isArray(id) ? id[0] : id;
            const noteId = rawId && !isNaN(Number(rawId)) && !rawId.toString().startsWith('offline_')
                ? Number(rawId)
                : rawId;

            const note = await offlineApi.getNote(noteId as string | number);
            if (!note) {
                Alert.alert('Error', 'Note not found');
                router.back();
                return;
            }

            setTitle(note.title);
            setContent(note.content || '');
            setColor(note.color || '#FFFFFF');

            // Reset and Set Labels
            const noteLabelIds = (note.labels || []).map((l: any) => l.id);
            setSelectedLabelIds(noteLabelIds);
            setInitialLabelIds(noteLabelIds);

            // Reset and Set Checklists
            if (note.checklist_items && note.checklist_items.length > 0) {
                setChecklistItems(note.checklist_items.map((item: any) => ({
                    ...item,
                    content: item.text
                })));
            } else {
                setChecklistItems([]);
            }

            // Reset and Set Reminder
            if (note.reminder) {
                setReminderDate(new Date(note.reminder.remind_at));
                setReminderId(note.reminder.id);
            } else {
                setReminderDate(null);
                setReminderId(null);
            }

            // Reset and Set Repeat
            if (note.repeat) {
                setRepeatFrequency(note.repeat);
            } else {
                setRepeatFrequency('none');
            }

            // Reset and Set Images
            if (note.images && note.images.length > 0) {
                setSelectedImages(note.images.map((img: any) => ({
                    id: img.id,
                    uri: img.image_url
                })));
            } else {
                setSelectedImages([]);
            }

            // Reset and Set Audio Recordings
            if (note.audio_recordings && note.audio_recordings.length > 0) {
                setAudioRecordings(note.audio_recordings);
            } else {
                setAudioRecordings([]);
            }

            // Reset and Set Drawings
            if (note.drawings && note.drawings.length > 0) {
                setDrawings(note.drawings);
            } else {
                setDrawings([]);
            }

        } catch (error: any) {
            console.error('Error fetching note details:', error);
            Alert.alert('Error', 'Failed to load note details');
            router.back();
        } finally {
            setFetching(false);
        }
    };

    const handleUpdate = async () => {
        if (!title && !content && checklistItems.length === 0) {
            Alert.alert('Error', 'Note cannot be empty');
            return;
        }

        setLoading(true);
        try {
            // 1. Update note using offline API
            await offlineApi.updateNote(id as string | number, {
                title,
                content,
                color,
                label_ids: selectedLabelIds,
                repeat: repeatFrequency !== 'none' ? repeatFrequency : null,
                checklist_items: checklistItems.map(item => ({
                    id: item.id,
                    text: item.content,
                    is_completed: item.is_completed
                }))
            });

            // 1.5 Handle Reminder Synchronization
            if (reminderDate) {
                await offlineApi.createReminder(id as string | number, reminderDate.toISOString());
            } else if (reminderId) {
                await offlineApi.deleteReminder(reminderId);
                setReminderId(null);
            }

            // 2. Handle Image Synchronization
            // a. Handle Deletions
            if (deletedImageIds.length > 0) {
                for (const imgId of deletedImageIds) {
                    await offlineApi.deleteImage(imgId);
                }
            }

            // b. Handle New Uploads (images with string IDs are newly added locally)
            const newImages = selectedImages.filter(img => typeof img.id === 'string');
            if (newImages.length > 0) {
                for (const img of newImages) {
                    const filename = img.uri.split('/').pop() || 'image.jpg';
                    const match = /\.(\w+)$/.exec(filename);
                    const type = match ? `image/${match[1]}` : `image/jpeg`;

                    await offlineApi.uploadImage(id as string | number, {
                        uri: img.uri,
                        name: filename,
                        type,
                    });
                }
            }

            // 3. Handle Audio Synchronization
            // a. Handle Deletions
            if (deletedAudioIds.length > 0) {
                for (const audioId of deletedAudioIds) {
                    await offlineApi.deleteAudio(audioId);
                }
            }

            // b. Handle New Upload
            if (newAudioUri) {
                await offlineApi.createAudio(id as string | number, newAudioUri);
            }

            // 4. Handle Drawing Synchronization
            // a. Handle Deletions
            if (deletedDrawingIds.length > 0) {
                for (const drawingId of deletedDrawingIds) {
                    await offlineApi.deleteDrawing(drawingId);
                }
            }

            // b. Handle New Upload
            if (newDrawingUri) {
                await offlineApi.createDrawing(id as string | number, newDrawingUri);
            }

            // 2. Local Notifications Logic
            // Disabled for now

            // 2. Handle Labels (Add new ones, Remove old ones)
            const labelsToAdd = selectedLabelIds.filter(lid => !initialLabelIds.includes(lid));
            const labelsToRemove = initialLabelIds.filter(lid => !selectedLabelIds.includes(lid));

            await Promise.all([
                ...labelsToAdd.map(lid => offlineApi.attachLabel(id as string | number, lid)),
                ...labelsToRemove.map(lid => offlineApi.detachLabel(id as string | number, lid))
            ]);

            // 3. Handle Deleted Items
            if (deletedItemIds.length > 0) {
                await Promise.all(
                    deletedItemIds
                        .map(itemId => offlineApi.deleteChecklistItem(itemId))
                );
            }

            // 4. Handle Remaining Items (Update or Create)
            await Promise.all(checklistItems.map(item => {
                if (typeof item.id === 'string' && !item.id.toString().startsWith('offline-')) {
                    // Assuming string IDs that aren't 'offline-' (if that was a thing) are new/temp
                    // Actually, just check if it's a number. If number -> Update. If string -> Create?
                    // BUT, if we are offline, existing items might be numbers (from server) OR strings (from local create).
                    // Ideally:
                    // If it has a number ID, it's definitely on server -> Update.
                    // If it has a string ID, it's local.
                    //    If it's a temp ID (e.g. temp-...), it's NEW -> Create.
                    //    If it's a string ID but not temp (unlikely for items?), treat as new?
                    // In `addChecklistItem` we use `temp-${Date.now()}`.
                }

                if (typeof item.id === 'number') {
                    // Existing item -> Update
                    return offlineApi.updateChecklistItem(item.id, {
                        text: item.content,
                        is_completed: item.is_completed
                    });
                } else {
                    // New item (string ID) -> Create
                    // Note: If we are editing a note that is itself offline (offline_123),
                    // createChecklistItem will queue CREATE_CHECKLIST with noteId=offline_123.
                    // Sync queue will handle dependent ID resolution.
                    return offlineApi.createChecklistItem(id as string | number, {
                        text: item.content,
                        is_completed: item.is_completed
                    });
                }
            }));

            console.log("Checklist and Label synchronization complete");
            if (isOnline) triggerSync();
            router.back();
        } catch (error: any) {
            console.error('Error updating note:', error.response?.data || error.message);
            Alert.alert('Error', 'Failed to update note');
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'We need permission to access your photos.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.7,
            base64: true,
        });

        if (!result.canceled && result.assets[0].uri) {
            setSelectedImages([...selectedImages, {
                id: Date.now().toString(), // Temporary string ID for local tracking
                uri: result.assets[0].uri
            }]);
        }
    };

    const removeImage = (img: NoteImage) => {
        if (typeof img.id === 'number') {
            setDeletedImageIds([...deletedImageIds, img.id]);
        }
        setSelectedImages(selectedImages.filter(i => i.id !== img.id));
    };

    const toggleLabel = (labelId: number) => {
        setSelectedLabelIds(prev =>
            prev.includes(labelId)
                ? prev.filter(lid => lid !== labelId)
                : [...prev, labelId]
        );
    };

    const addChecklistItem = () => {
        if (!newChecklistItem.trim()) return;
        setChecklistItems([
            ...checklistItems,
            { id: `temp-${Date.now()}`, content: newChecklistItem.trim(), is_completed: false }
        ]);
        setNewChecklistItem('');
    };

    const toggleChecklistItem = (itemId: string | number) => {
        setChecklistItems(checklistItems.map(item =>
            item.id === itemId ? { ...item, is_completed: !item.is_completed } : item
        ));
    };

    const removeChecklistItem = (itemId: string | number) => {
        setChecklistItems(checklistItems.filter(item => item.id !== itemId));
        if (typeof itemId === 'number') {
            setDeletedItemIds([...deletedItemIds, itemId]);
        }
    };

    const handleDelete = () => {
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
                            const targetId = Array.isArray(id) ? id[0] : id;
                            await offlineApi.deleteNote(targetId);
                            if (isOnline) triggerSync();
                            router.back();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete note');
                        }
                    }
                },
            ]
        );
    };

    const handleShare = async () => {
        try {
            let shareMessage = `${title}\n\n`;
            if (content) {
                shareMessage += `${content}\n\n`;
            }

            if (checklistItems.length > 0) {
                const checklistText = checklistItems
                    .map(item => `${item.is_completed ? '☑' : '☐'} ${item.content}`)
                    .join('\n');
                shareMessage += `Checklist:\n${checklistText}\n\n`;
            }

            if (selectedLabelIds.length > 0) {
                const labels = allLabels
                    .filter(l => selectedLabelIds.includes(l.id))
                    .map(l => `#${l.name}`)
                    .join(' ');
                shareMessage += `Labels: ${labels}`;
            }

            await Share.share({
                message: shareMessage.trim(),
                title: title
            });
        } catch (error) {
            console.error('Share error:', error);
        }
    };

    if (fetching) {
        return (
            <View style={[styles.centered, isDarkMode && styles.containerDark]}>
                <ActivityIndicator size="large" color="#6366f1" />
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={[styles.header, isDarkMode && styles.headerDark]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Feather name="chevron-left" size={28} color={isDarkMode ? "#94a3b8" : "#374151"} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, isDarkMode && styles.textDark]}>Edit Note</Text>
                    <View style={styles.headerActions}>
                        <TouchableOpacity onPress={handleShare} style={styles.shareIconButton}>
                            <Feather name="share-2" size={20} color="#6366f1" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
                            <Feather name="trash-2" size={22} color="#EF4444" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleUpdate}
                            disabled={loading}
                            style={[styles.saveButton, isDarkMode && styles.saveButtonDark]}
                        >
                            {loading ? (
                                <ActivityIndicator color="#6366f1" />
                            ) : (
                                <Text style={styles.saveButtonText}>Done</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {reminderDate && (
                    <View style={styles.reminderBanner}>
                        <View style={styles.reminderInfo}>
                            <Feather name="bell" size={14} color="#6366f1" />
                            <Text style={styles.reminderText}>
                                {reminderDate.toLocaleString([], {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                                {repeatFrequency !== 'none' && ` (Repeats ${repeatFrequency})`}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={async () => {
                            setReminderDate(null);
                            // await Notifications.cancelScheduledNotificationAsync(id.toString());
                        }}>
                            <Feather name="x" size={16} color="#9CA3AF" />
                        </TouchableOpacity>
                    </View>
                )}

                <ScrollView
                    style={{ flex: 1, backgroundColor: isDarkMode ? '#0f172a' : color }}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <TextInput
                        style={[styles.titleInput, isDarkMode && styles.textDark]}
                        placeholder="Title"
                        placeholderTextColor={isDarkMode ? "#475569" : "#9CA3AF"}
                        value={title}
                        onChangeText={setTitle}
                        maxLength={50}
                    />

                    {/* Labels Section */}
                    {allLabels.length > 0 && (
                        <View style={styles.labelSection}>
                            <Text style={[styles.sectionLabel, isDarkMode && styles.sectionLabelDark]}>Labels</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.labelScroll}>
                                {allLabels.map(label => (
                                    <TouchableOpacity
                                        key={label.id}
                                        style={[
                                            styles.labelChip,
                                            isDarkMode && styles.labelChipDark,
                                            selectedLabelIds.includes(label.id) && styles.labelChipSelected
                                        ]}
                                        onPress={() => toggleLabel(label.id)}
                                    >
                                        <Text style={[
                                            styles.labelChipText,
                                            isDarkMode && styles.textDark,
                                            selectedLabelIds.includes(label.id) && styles.labelChipTextSelected
                                        ]}>
                                            {label.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    <TextInput
                        style={[styles.contentInput, isDarkMode && styles.textDark]}
                        placeholder="Start typing..."
                        placeholderTextColor={isDarkMode ? "#475569" : "#9CA3AF"}
                        value={content}
                        onChangeText={setContent}
                        multiline
                        textAlignVertical="top"
                    />

                    {/* Checklist Section */}
                    <View style={styles.checklistSection}>
                        <Text style={[styles.sectionLabel, isDarkMode && styles.sectionLabelDark]}>Checklist</Text>

                        {checklistItems.map((item) => (
                            <View key={item.id} style={[styles.checklistItem, isDarkMode && styles.checklistItemDark]}>
                                <TouchableOpacity
                                    onPress={() => toggleChecklistItem(item.id)}
                                    style={styles.checkbox}
                                >
                                    <View style={[
                                        styles.checkboxSquare,
                                        isDarkMode && styles.checkboxDark,
                                        item.is_completed && styles.checkboxChecked
                                    ]}>
                                        {item.is_completed && <Feather name="check" size={14} color="white" />}
                                    </View>
                                </TouchableOpacity>
                                <Text style={[
                                    styles.checklistText,
                                    isDarkMode && styles.textDark,
                                    item.is_completed && styles.checklistTextCompleted
                                ]}>
                                    {item.content}
                                </Text>
                                <TouchableOpacity onPress={() => removeChecklistItem(item.id)}>
                                    <Feather name="x" size={20} color="#9CA3AF" />
                                </TouchableOpacity>
                            </View>
                        ))}

                        <View style={styles.addChecklistContainer}>
                            <TouchableOpacity onPress={addChecklistItem} style={[styles.addButton, isDarkMode && styles.reminderButtonDark]}>
                                <Feather name="plus" size={20} color="#6366f1" />
                            </TouchableOpacity>
                            <TextInput
                                style={[styles.addChecklistInput, isDarkMode && styles.textDark]}
                                placeholder="Add an item..."
                                placeholderTextColor={isDarkMode ? "#475569" : "#9CA3AF"}
                                value={newChecklistItem}
                                onChangeText={setNewChecklistItem}
                                onSubmitEditing={addChecklistItem}
                            />
                        </View>
                    </View>

                    {/* Reminder & Color Section */}
                    <View style={styles.toolsSection}>
                        <View style={styles.toolRow}>
                            <Text style={[styles.sectionLabel, isDarkMode && styles.sectionLabelDark]}>Reminder</Text>
                            <TouchableOpacity
                                style={[
                                    styles.reminderButton,
                                    isDarkMode && styles.reminderButtonDark,
                                    reminderDate && styles.reminderButtonActive
                                ]}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Feather
                                    name="bell"
                                    size={20}
                                    color={reminderDate ? '#FFFFFF' : '#6366f1'}
                                />
                                <Text style={[styles.reminderButtonText, reminderDate && styles.reminderButtonTextActive]}>
                                    {reminderDate ? 'Change' : 'Set Reminder'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {showDatePicker && (
                            <DateTimePicker
                                value={reminderDate || new Date()}
                                mode="date"
                                display="default"
                                minimumDate={new Date()}
                                onChange={(event: any, selectedDate?: Date) => {
                                    setShowDatePicker(false);
                                    if (selectedDate) {
                                        setReminderDate(selectedDate);
                                        setShowTimePicker(true);
                                    }
                                }}
                            />
                        )}

                        {showTimePicker && (
                            <DateTimePicker
                                value={reminderDate || new Date()}
                                mode="time"
                                display="default"
                                onChange={(event: any, selectedTime?: Date) => {
                                    setShowTimePicker(false);
                                    if (selectedTime) {
                                        const finalDate = new Date(reminderDate || new Date());
                                        finalDate.setHours(selectedTime.getHours());
                                        finalDate.setMinutes(selectedTime.getMinutes());
                                        setReminderDate(finalDate);
                                    }
                                }}
                            />
                        )}

                        {reminderDate && (
                            <View style={styles.repeatSection}>
                                <Text style={[styles.subSectionLabel, isDarkMode && styles.sectionLabelDark]}>Repeat</Text>
                                <View style={styles.repeatChips}>
                                    {['none', 'daily', 'weekly'].map((freq) => (
                                        <TouchableOpacity
                                            key={freq}
                                            style={[
                                                styles.repeatChip,
                                                isDarkMode && styles.labelChipDark,
                                                repeatFrequency === freq && styles.repeatChipActive
                                            ]}
                                            onPress={() => setRepeatFrequency(freq as any)}
                                        >
                                            <Text style={[
                                                styles.repeatChipText,
                                                isDarkMode && styles.textDark,
                                                repeatFrequency === freq && styles.repeatChipTextActive
                                            ]}>
                                                {freq.charAt(0).toUpperCase() + freq.slice(1)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        <View style={styles.toolRow}>
                            <Text style={[styles.sectionLabel, isDarkMode && styles.sectionLabelDark]}>Media</Text>
                            <TouchableOpacity
                                style={[styles.mediaButton, isDarkMode && styles.mediaButtonDark]}
                                onPress={pickImage}
                            >
                                <Feather name="image" size={20} color="#6366f1" />
                                <Text style={styles.mediaButtonText}>Add Photo</Text>
                            </TouchableOpacity>
                        </View>

                        {selectedImages.length > 0 && (
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.imageStrip}
                                contentContainerStyle={{ gap: 12 }}
                            >
                                {selectedImages.map((img) => (
                                    <View key={img.id} style={styles.imageWrapper}>
                                        <TouchableOpacity
                                            activeOpacity={0.9}
                                            onPress={() => removeImage(img)}
                                        >
                                            <View style={[styles.imageThumbnailContainer, isDarkMode && styles.thumbnailContainerDark]}>
                                                <Feather name="x-circle" size={20} color="#EF4444" style={styles.removeImageOverlay} />
                                                <Image source={{ uri: img.uri }} style={styles.imageThumbnail} />
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </ScrollView>
                        )}

                        {/* Audio Recording Section */}
                        <View style={styles.toolRow}>
                            <Text style={[styles.sectionLabel, isDarkMode && styles.sectionLabelDark]}>Audio Note</Text>
                        </View>

                        {/* Display existing audio recordings */}
                        {audioRecordings.map((audio) => {
                            const audioUri = audio.audio_url || audio.file_url || audio.uri;
                            const isThisPlaying = isPlaying && currentUri === audioUri;

                            return (
                                <View key={audio.id} style={[styles.audioCard, isDarkMode && styles.audioCardDark]}>
                                    <View style={styles.audioCardHeader}>
                                        <TouchableOpacity
                                            style={styles.audioCardIcon}
                                            onPress={() => {
                                                if (audioUri) {
                                                    playAudio(audioUri, {
                                                        noteId: id as string,
                                                        title: title || 'Audio Recording',
                                                        duration: audio.duration ? audio.duration * 1000 : undefined
                                                    });
                                                } else {
                                                    Alert.alert('Error', 'Audio file not found');
                                                }
                                            }}
                                        >
                                            <Feather name={isThisPlaying ? "pause" : "play"} size={24} color="#6366f1" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.audioDeleteButton}
                                            onPress={() => {
                                                setDeletedAudioIds([...deletedAudioIds, audio.id]);
                                                setAudioRecordings(audioRecordings.filter(a => a.id !== audio.id));
                                            }}
                                        >
                                            <Feather name="trash-2" size={20} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                    <Text style={[styles.audioCardLabel, isDarkMode && styles.textDark]}>Audio Recording</Text>
                                    <Text style={[styles.audioCardDuration, isDarkMode && styles.textDark]}>
                                        {audio.duration ? `${Math.floor(audio.duration / 60)}:${(audio.duration % 60).toString().padStart(2, '0')}` : 'Unknown duration'}
                                    </Text>
                                </View>
                            );
                        })}

                        {/* Add new audio if no existing audio or user wants to add more */}
                        {audioRecordings.length === 0 && !newAudioUri && (
                            <AudioRecorder
                                onAudioRecorded={(uri) => setNewAudioUri(uri)}
                                onAudioDeleted={() => setNewAudioUri(null)}
                                existingAudioUri={newAudioUri || undefined}
                            />
                        )}

                        {/* Drawing Section */}
                        <View style={styles.toolRow}>
                            <Text style={[styles.sectionLabel, isDarkMode && styles.sectionLabelDark]}>Freehand Drawing</Text>
                        </View>

                        {/* Display existing drawings */}
                        {drawings.map((drawing) => (
                            <View key={drawing.id} style={[styles.drawingCard, isDarkMode && styles.drawingCardDark]}>
                                <TouchableOpacity
                                    style={styles.drawingDeleteButton}
                                    onPress={() => {
                                        setDeletedDrawingIds([...deletedDrawingIds, drawing.id]);
                                        setDrawings(drawings.filter(d => d.id !== drawing.id));
                                    }}
                                >
                                    <Feather name="x-circle" size={24} color="#EF4444" />
                                </TouchableOpacity>
                                <Image
                                    source={{ uri: drawing.drawing_url }}
                                    style={styles.drawingCardImage}
                                    resizeMode="contain"
                                />
                            </View>
                        ))}

                        {/* Add new drawing if no existing drawing or user wants to add more */}
                        {drawings.length === 0 && !newDrawingUri && (
                            <DrawingCanvas
                                onDrawingSaved={(uri) => setNewDrawingUri(uri)}
                                onDrawingDeleted={() => setNewDrawingUri(null)}
                                existingDrawing={newDrawingUri || undefined}
                            />
                        )}

                        <View style={styles.colorSection}>
                            <Text style={[styles.sectionLabel, isDarkMode && styles.sectionLabelDark]}>Theme</Text>
                            <View style={styles.colorList}>
                                {COLORS.map((c) => (
                                    <TouchableOpacity
                                        key={c}
                                        style={[
                                            styles.colorOption,
                                            { backgroundColor: c },
                                            color === c && styles.selectedColor
                                        ]}
                                        onPress={() => setColor(c)}
                                    />
                                ))}
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
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
    headerDark: {
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    textDark: {
        color: '#f8fafc',
    },
    saveButtonDark: {
        backgroundColor: '#1e293b',
    },
    inputDark: {
        color: '#f8fafc',
    },
    sectionLabelDark: {
        color: '#475569',
    },
    labelChipDark: {
        backgroundColor: '#1e293b',
        borderColor: '#334155',
    },
    checklistItemDark: {
        backgroundColor: '#1e293b',
    },
    checkboxDark: {
        borderColor: '#334155',
    },
    reminderButtonDark: {
        backgroundColor: '#1e293b',
    },
    mediaButtonDark: {
        backgroundColor: '#1e293b',
        borderColor: '#334155',
    },
    thumbnailContainerDark: {
        backgroundColor: '#1e293b',
    },
    mediaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: '#F3F4FB',
        borderWidth: 1,
        borderColor: '#E0E7FF',
    },
    mediaButtonText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '600',
        color: '#4F46E5',
    },
    imageStrip: {
        marginVertical: 16,
    },
    imageWrapper: {
        position: 'relative',
    },
    imageThumbnailContainer: {
        width: 100,
        height: 100,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageThumbnail: {
        width: '100%',
        height: '100%',
    },
    removeImageOverlay: {
        position: 'absolute',
        top: 4,
        right: 4,
        zIndex: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 64,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    shareIconButton: {
        padding: 8,
        marginRight: 4,
    },
    deleteButton: {
        padding: 8,
        marginRight: 8,
    },
    saveButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#EEF2FF',
        borderRadius: 12,
    },
    saveButtonText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#6366f1',
    },
    scrollContent: {
        padding: 24,
    },
    titleInput: {
        fontSize: 28,
        fontWeight: '900',
        color: '#111827',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    labelSection: {
        marginBottom: 20,
    },
    labelScroll: {
        flexDirection: 'row',
        marginTop: 8,
    },
    labelChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    labelChipSelected: {
        backgroundColor: '#6366f1',
        borderColor: '#6366f1',
    },
    labelChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
    },
    labelChipTextSelected: {
        color: '#FFFFFF',
    },
    contentInput: {
        fontSize: 18,
        color: '#374151',
        minHeight: 150,
        lineHeight: 28,
        fontWeight: '400',
    },
    checklistSection: {
        marginTop: 24,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '800',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
    },
    checklistItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 12,
    },
    checkbox: {
        marginRight: 12,
    },
    checkboxSquare: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#6366f1',
        borderColor: '#6366f1',
    },
    checklistText: {
        flex: 1,
        fontSize: 16,
        color: '#374151',
        fontWeight: '500',
    },
    checklistTextCompleted: {
        textDecorationLine: 'line-through',
        color: '#9CA3AF',
    },
    addChecklistContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        paddingHorizontal: 4,
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    addChecklistInput: {
        flex: 1,
        fontSize: 16,
        color: '#374151',
        fontWeight: '500',
    },

    colorList: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    colorOption: {
        width: 36,
        height: 36,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    selectedColor: {
        borderWidth: 3,
        borderColor: '#6366f1',
    },
    reminderBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F5F7FF',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E7FF',
    },
    reminderInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    reminderText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#4F46E5',
    },
    toolsSection: {
        marginTop: 32,
    },
    toolRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    reminderButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 8,
    },
    reminderButtonActive: {
        backgroundColor: '#6366f1',
    },
    reminderButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#6366f1',
    },
    reminderButtonTextActive: {
        color: '#FFFFFF',
    },
    colorSection: {
        marginTop: 8,
        paddingBottom: 40,
    },
    repeatSection: {
        marginTop: 16,
        marginBottom: 8,
    },
    subSectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    repeatChips: {
        flexDirection: 'row',
        gap: 8,
    },
    repeatChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    repeatChipActive: {
        backgroundColor: '#6366f1',
        borderColor: '#6366f1',
    },
    repeatChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6B7280',
    },
    repeatChipTextActive: {
        color: '#FFFFFF',
    },
    audioCard: {
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        minHeight: 150,
    },
    audioCardDark: {
        backgroundColor: '#1e293b',
    },
    audioCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    audioCardIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    audioDeleteButton: {
        padding: 8,
    },
    audioCardLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 4,
    },
    audioCardDuration: {
        fontSize: 14,
        color: '#9CA3AF',
    },
    drawingCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 16,
        position: 'relative',
    },
    drawingCardDark: {
        backgroundColor: '#1e293b',
    },
    drawingCardImage: {
        width: '100%',
        height: 400,
        backgroundColor: '#F9FAFB',
    },
    drawingDeleteButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 20,
        padding: 4,
    },
    // Legacy styles (keeping for compatibility)
    audioPlayer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 12,
        gap: 12,
        marginBottom: 12,
    },
    audioPlayerDark: {
        backgroundColor: '#1e293b',
    },
    audioInfo: {
        flex: 1,
    },
    audioLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 2,
    },
    audioDuration: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    drawingPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 12,
        gap: 12,
        marginBottom: 12,
    },
    drawingPreviewDark: {
        backgroundColor: '#1e293b',
    },
    drawingThumbnail: {
        width: 60,
        height: 60,
        borderRadius: 8,
    },
    drawingInfo: {
        flex: 1,
    },
    drawingLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
});

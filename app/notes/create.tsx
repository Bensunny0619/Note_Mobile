import React, { useState, useRef } from 'react';
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
    Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../services/api';
import * as offlineApi from '../../services/offlineApi';
import { useNetwork } from '../../context/NetworkContext';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useLabels } from '../../context/LabelContext';
import { useTheme } from '../../context/ThemeContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import AudioRecorder from '../../components/AudioRecorder';
import DrawingCanvas, { DrawingCanvasRef } from '../../components/DrawingCanvas';

const COLORS = ['#FFFFFF', '#FECACA', '#FDE68A', '#A7F3D0', '#BFDBFE', '#DDD6FE', '#F5D0FE'];

type ChecklistItem = {
    id: string;
    content: string;
    is_completed: boolean;
};

export default function CreateNote() {
    const { labels } = useLabels();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [color, setColor] = useState('#FFFFFF');
    const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
    const [selectedLabelIds, setSelectedLabelIds] = useState<number[]>([]);
    const [newChecklistItem, setNewChecklistItem] = useState('');
    const [loading, setLoading] = useState(false);
    const [reminderDate, setReminderDate] = useState<Date | null>(null);
    const [repeatFrequency, setRepeatFrequency] = useState<'none' | 'daily' | 'weekly'>('none');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [audioUri, setAudioUri] = useState<string | null>(null);
    const [drawingUri, setDrawingUri] = useState<string | null>(null);
    const { isDarkMode } = useTheme();
    const { isOnline, triggerSync } = useNetwork();
    const router = useRouter();
    const { type } = useLocalSearchParams<{ type: string }>();

    const drawingCanvasRef = useRef<DrawingCanvasRef>(null);

    React.useEffect(() => {
        console.log("CreateNote Type Param:", type);
        if (type === 'image') {
            // Small delay to ensure permissions/ui are ready
            setTimeout(() => {
                pickImage();
            }, 500);
        } else if (type === 'list') {
            if (checklistItems.length === 0) {
                setChecklistItems([
                    { id: Date.now().toString(), content: '', is_completed: false }
                ]);
            }
        }
    }, [type]);

    const handleCreate = async () => {
        if (!title && !content && checklistItems.length === 0) {
            Alert.alert('Error', 'Please enter some content for your note');
            return;
        }

        setLoading(true);
        try {
            // 1. Create the note using offline API
            const notePayload = {
                title: title || 'Untitled',
                content,
                color,
                label_ids: selectedLabelIds,
                repeat: repeatFrequency !== 'none' ? repeatFrequency : null,
                audio_uri: audioUri,
                drawing_uri: drawingUri,
            };

            const createdNote = await offlineApi.createNote(notePayload);
            const noteId = createdNote.id;

            // ... (rest of logic handles extra labels/images if any, though offlineApi now handles most)

            // 3. Upload Images if any exist
            if (selectedImages.length > 0) {
                console.log("--- QUEUING IMAGE UPLOADS ---");
                for (const uri of selectedImages) {
                    const filename = uri.split('/').pop() || 'image.jpg';
                    const match = /\.(\w+)$/.exec(filename);
                    const type = match ? `image/${match[1]}` : `image/jpeg`;

                    await offlineApi.uploadImage(noteId, {
                        uri,
                        name: filename,
                        type,
                    });
                }
            }

            // 4. Add labels
            if (selectedLabelIds.length > 0) {
                for (const labelId of selectedLabelIds) {
                    await offlineApi.attachLabel(noteId, labelId);
                }
            }

            // 5. Create checklist items
            if (checklistItems.length > 0) {
                console.log("--- CREATING CHECKLIST ITEMS ---");
                // Queue checklist creation for later sync (when note gets a real ID)
                for (const item of checklistItems) {
                    await offlineApi.createChecklistItem(noteId, {
                        text: item.content,
                        is_completed: item.is_completed
                    });
                }
            }

            // Trigger sync to process queue immediately
            if (isOnline) {
                triggerSync();
            }

            router.back();
        } catch (error: any) {
            console.error('Error creating note/checklists:', error.response?.data || error.message);
            Alert.alert('Error', 'Failed to save note');
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
            setSelectedImages([...selectedImages, result.assets[0].uri]);
        }
    };

    const removeImage = (index: number) => {
        const updatedImages = [...selectedImages];
        updatedImages.splice(index, 1);
        setSelectedImages(updatedImages);
    };

    const toggleLabel = (labelId: number) => {
        setSelectedLabelIds(prev =>
            prev.includes(labelId)
                ? prev.filter(id => id !== labelId)
                : [...prev, labelId]
        );
    };

    const addChecklistItem = () => {
        if (!newChecklistItem.trim()) return;
        setChecklistItems([
            ...checklistItems,
            { id: Date.now().toString(), content: newChecklistItem.trim(), is_completed: false }
        ]);
        setNewChecklistItem('');
    };

    const toggleChecklistItem = (id: string) => {
        setChecklistItems(checklistItems.map(item =>
            item.id === id ? { ...item, is_completed: !item.is_completed } : item
        ));
    };

    const removeChecklistItem = (id: string) => {
        setChecklistItems(checklistItems.filter(item => item.id !== id));
    };

    const handleToolbarAdd = () => {
        Alert.alert(
            'Add Attachment',
            'Choose what you want to add',
            [
                { text: 'Take Photo', onPress: () => ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 }).then(r => { if (!r.canceled && r.assets[0].uri) setSelectedImages([...selectedImages, r.assets[0].uri]); }) },
                { text: 'Choose Image', onPress: pickImage },
                { text: 'Drawing', onPress: () => { setDrawingUri(null); drawingCanvasRef.current?.open(); } },
                { text: 'Recording', onPress: () => { /* Audio recorder is auto-visible if empty, maybe scroll to it? */ } },
                { text: 'Checkboxes', onPress: () => { if (checklistItems.length === 0) setChecklistItems([{ id: Date.now().toString(), content: '', is_completed: false }]); } },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

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
                    <Text style={[styles.headerTitle, isDarkMode && styles.textDark]}>New Note</Text>
                    <TouchableOpacity
                        onPress={handleCreate}
                        disabled={loading}
                        style={[styles.saveButton, isDarkMode && styles.saveButtonDark]}
                    >
                        {loading ? (
                            <ActivityIndicator color="#6366f1" />
                        ) : (
                            <Text style={styles.saveButtonText}>Save</Text>
                        )}
                    </TouchableOpacity>
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
                        <TouchableOpacity onPress={() => setReminderDate(null)}>
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
                    {labels.length > 0 && (
                        <View style={styles.labelSection}>
                            <Text style={[styles.sectionLabel, isDarkMode && styles.sectionLabelDark]}>Labels</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.labelScroll}>
                                {labels.map(label => (
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

                    {/* Standard Content */}
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
                                        // Keep the date part, update the time part
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
                                {selectedImages.map((uri, index) => (
                                    <View key={index} style={styles.imageWrapper}>
                                        <TouchableOpacity
                                            activeOpacity={0.9}
                                            onPress={() => removeImage(index)}
                                        >
                                            <View style={[styles.imageThumbnailContainer, isDarkMode && styles.thumbnailContainerDark]}>
                                                <Feather name="x-circle" size={20} color="#EF4444" style={styles.removeImageOverlay} />
                                                <Image source={{ uri }} style={styles.imageThumbnail} />
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
                        <AudioRecorder
                            onAudioRecorded={(uri) => setAudioUri(uri)}
                            onAudioDeleted={() => setAudioUri(null)}
                            existingAudioUri={audioUri || undefined}
                            autoStart={type === 'audio'}
                        />

                        {/* Drawing Section */}
                        <View style={styles.toolRow}>
                            <Text style={[styles.sectionLabel, isDarkMode && styles.sectionLabelDark]}>Freehand Drawing</Text>
                        </View>
                        <DrawingCanvas
                            ref={drawingCanvasRef}
                            onDrawingSaved={(uri) => setDrawingUri(uri)}
                            onDrawingDeleted={() => setDrawingUri(null)}
                            existingDrawing={drawingUri || undefined}
                            initialOpen={type === 'drawing'}
                        />

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

            {/* Google Keep Bottom Toolbar */}
            <View style={[styles.bottomToolbar, isDarkMode && styles.bottomToolbarDark]}>
                <TouchableOpacity style={styles.toolbarAction} onPress={handleToolbarAdd}>
                    <Feather name="plus-square" size={24} color={isDarkMode ? "#cbd5e1" : "#5f6368"} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.toolbarAction} onPress={() => setShowColorPicker(!showColorPicker)}>
                    <MaterialIcons name="palette" size={24} color={isDarkMode ? "#cbd5e1" : "#5f6368"} />
                </TouchableOpacity>

                <Text style={[styles.editedText, isDarkMode && styles.textDarkSecondary]}>
                    Edited {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>

                <TouchableOpacity style={styles.toolbarAction} onPress={() => {/* More options */ }}>
                    <Feather name="more-vertical" size={24} color={isDarkMode ? "#cbd5e1" : "#5f6368"} />
                </TouchableOpacity>
            </View>
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 64,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
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
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
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
        marginBottom: 12, // Reduced from 20
    },
    labelScroll: {
        flexDirection: 'row',
        marginTop: 8,
    },
    labelChip: {
        paddingHorizontal: 10, // Reduced from 12
        paddingVertical: 4, // Reduced from 6
        borderRadius: 16, // Smaller radius
        backgroundColor: '#F3F4F6',
        marginRight: 6, // Reduced from 8
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
        marginBottom: 12,
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
        color: '#394150',
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
    bottomToolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: 'transparent',
    },
    bottomToolbarDark: {
        backgroundColor: '#0f172a',
    },
    toolbarAction: {
        padding: 8,
    },
    editedText: {
        fontSize: 12,
        color: '#64748b',
    },
    textDarkSecondary: {
        color: '#94a3b8',
    },
});


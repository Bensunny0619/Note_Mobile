import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAudio } from '../context/AudioContext';

type NoteCardProps = {
    note: any;
    onPress: () => void;
    onLongPress?: () => void;
    showReminder?: boolean;
    showArchiveStatus?: boolean;
};

export default function NoteCard({ note, onPress, onLongPress, showReminder, showArchiveStatus }: NoteCardProps) {
    const { isDarkMode } = useTheme();
    const { playAudio, isPlaying, currentUri } = useAudio();

    const hasChecklist = note.checklist_items?.length > 0;
    const hasImages = note.images?.length > 0;
    const hasAudio = note.audio_recordings?.length > 0;
    const hasDrawing = note.drawings?.length > 0;

    return (
        <TouchableOpacity
            style={[
                styles.noteCard,
                { backgroundColor: note.color || '#FFFFFF' },
                isDarkMode && styles.noteCardDark,
                note.is_pinned && styles.pinnedCard
            ]}
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.7}
        >
            {note.is_pinned && (
                <View style={styles.pinIndicator}>
                    <Feather name="bookmark" size={16} color="#6366f1" />
                </View>
            )}

            {note.title ? (
                <Text style={[styles.noteTitle, isDarkMode && styles.noteTitleDark]} numberOfLines={2}>
                    {note.title}
                </Text>
            ) : null}

            {note.content ? (
                <Text style={[styles.noteContent, isDarkMode && styles.noteContentDark]} numberOfLines={8}>
                    {note.content}
                </Text>
            ) : null}

            {hasChecklist && (
                <View style={styles.checklistPreview}>
                    {note.checklist_items.slice(0, 3).map((item: any, index: number) => (
                        <View key={index} style={styles.checklistItem}>
                            <Feather
                                name={item.is_completed ? "check-square" : "square"}
                                size={14}
                                color={isDarkMode ? "#94a3b8" : "#6B7280"}
                            />
                            <Text
                                style={[
                                    styles.checklistText,
                                    isDarkMode && styles.checklistTextDark,
                                    item.is_completed && styles.checklistCompleted
                                ]}
                                numberOfLines={1}
                            >
                                {item.content || item.text}
                            </Text>
                        </View>
                    ))}
                    {note.checklist_items.length > 3 && (
                        <Text style={[styles.moreText, isDarkMode && styles.moreTextDark]}>
                            +{note.checklist_items.length - 3} more
                        </Text>
                    )}
                </View>
            )}

            {hasImages && (
                <View style={styles.imagePreview}>
                    <Image
                        source={{ uri: note.images[0].image_url || note.images[0].uri }}
                        style={styles.previewImage}
                    />
                    {note.images.length > 1 && (
                        <View style={styles.imageCount}>
                            <Text style={styles.imageCountText}>+{note.images.length - 1}</Text>
                        </View>
                    )}
                </View>
            )}

            <View style={styles.noteFooter}>
                <View style={styles.attachmentIcons}>
                    {hasAudio && <Feather name="mic" size={14} color={isDarkMode ? "#94a3b8" : "#6B7280"} style={styles.icon} />}
                    {hasDrawing && <Feather name="edit-3" size={14} color={isDarkMode ? "#94a3b8" : "#6B7280"} style={styles.icon} />}
                    {showReminder && note.reminder && (
                        <Feather name="bell" size={14} color="#6366f1" style={styles.icon} />
                    )}
                </View>

                {note.labels && note.labels.length > 0 && (
                    <View style={styles.labelContainer}>
                        {note.labels.slice(0, 2).map((label: any) => (
                            <View key={label.id} style={[styles.labelChip, isDarkMode && styles.labelChipDark]}>
                                <Text style={[styles.labelText, isDarkMode && styles.labelTextDark]} numberOfLines={1}>
                                    {label.name}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    noteCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        elevation: 1,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
            },
            web: {
                boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
            }
        }),
    },
    noteCardDark: {
        borderColor: '#334155',
        backgroundColor: '#1e293b',
    },
    pinnedCard: {
        borderColor: '#6366f1',
        borderWidth: 1.5,
    },
    pinIndicator: {
        position: 'absolute',
        top: 8,
        right: 8,
    },
    noteTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 8,
    },
    noteTitleDark: {
        color: '#f8fafc',
    },
    noteContent: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
    noteContentDark: {
        color: '#cbd5e1',
    },
    checklistPreview: {
        marginTop: 8,
    },
    checklistItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 8,
    },
    checklistText: {
        fontSize: 13,
        color: '#6B7280',
        flex: 1,
    },
    checklistTextDark: {
        color: '#94a3b8',
    },
    checklistCompleted: {
        textDecorationLine: 'line-through',
        opacity: 0.6,
    },
    moreText: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 4,
    },
    moreTextDark: {
        color: '#64748b',
    },
    imagePreview: {
        marginTop: 8,
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
    },
    previewImage: {
        width: '100%',
        height: 120,
        borderRadius: 8,
    },
    imageCount: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    imageCountText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    noteFooter: {
        marginTop: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    attachmentIcons: {
        flexDirection: 'row',
        gap: 8,
    },
    icon: {
        marginRight: 4,
    },
    labelContainer: {
        flexDirection: 'row',
        gap: 6,
        flex: 1,
        justifyContent: 'flex-end',
    },
    labelChip: {
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        maxWidth: 80,
    },
    labelChipDark: {
        backgroundColor: '#312e81',
    },
    labelText: {
        fontSize: 11,
        color: '#6366f1',
        fontWeight: '500',
    },
    labelTextDark: {
        color: '#a5b4fc',
    },
});

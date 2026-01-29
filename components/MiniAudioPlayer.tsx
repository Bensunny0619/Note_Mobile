import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';
import { useRouter, usePathname } from 'expo-router';

// Helper to format milliseconds to mm:ss
const formatTime = (millis: number) => {
    if (!millis) return '0:00';
    const minutes = Math.floor(millis / 60000);
    const seconds = Math.floor((millis % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export default function MiniAudioPlayer() {
    const {
        currentUri,
        isPlaying,
        metadata,
        playAudio,
        stopAudio,
        position,
        duration
    } = useAudio();

    const { isDarkMode } = useTheme();
    const router = useRouter();
    const pathname = usePathname();

    // Don't show if no audio is loaded
    if (!currentUri || !metadata) return null;

    // Check if we are currently on the editing screen for this note
    // If so, we might want to hide the mini player to avoid duplication,
    // OR current design request specifically asks for it when "going back".
    // "if I click on it and it takes me back to the note" implies it shows when AWAY from the note.
    const isCurrentNoteScreen = pathname === `/notes/edit/${metadata.noteId}`;

    // Optional: Hide if we are on the note screen itself (assuming the note screen has its own player UI)
    // However, if we want seamless transition, we might want to keep the mini player OR 
    // sync the large player. For simplicity, let's SHOW it everywhere for now, 
    // or HIDE it if we are on that specific note screen to avoid UI clutter.
    // The user said: "when i play a recording... go back... it should continue playing... show a mini player"
    // This implies it shows when NOT on the note screen.

    if (isCurrentNoteScreen) return null;

    return (
        <TouchableOpacity
            style={[styles.container, isDarkMode && styles.containerDark]}
            onPress={() => {
                // Navigate to the note
                router.push(`/notes/edit/${metadata.noteId}` as any);
            }}
            activeOpacity={0.9}
        >
            {/* Progress Bar (at top of mini player) */}
            <View style={styles.progressBarContainer}>
                <View
                    style={[
                        styles.progressBar,
                        { width: `${duration > 0 ? (position / duration) * 100 : 0}%` }
                    ]}
                />
            </View>

            <View style={styles.content}>
                <View style={[styles.iconContainer, isDarkMode && styles.iconContainerDark]}>
                    <Feather name="mic" size={20} color="#6366f1" />
                </View>

                <View style={styles.textContainer}>
                    <Text style={[styles.title, isDarkMode && styles.textDark]} numberOfLines={1}>
                        {metadata.title || 'Audio Recording'}
                    </Text>
                    <Text style={styles.timeInfo}>
                        {formatTime(position)} / {formatTime(duration)}
                    </Text>
                </View>

                <View style={styles.controls}>
                    <TouchableOpacity
                        onPress={(e) => {
                            e.stopPropagation();
                            if (currentUri) playAudio(currentUri, metadata); // Toggles play/pause
                        }}
                        style={styles.controlButton}
                    >
                        <Feather name={isPlaying ? "pause" : "play"} size={24} color={isDarkMode ? "#fff" : "#111827"} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={(e) => {
                            e.stopPropagation();
                            stopAudio();
                        }}
                        style={[styles.controlButton, { marginLeft: 12 }]}
                    >
                        <Feather name="x" size={24} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 85, // Above tab bar (approx 60 + padding)
        left: 10,
        right: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        elevation: 8,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
            },
            web: {
                boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
            }
        }),
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    containerDark: {
        backgroundColor: '#1e293b',
        borderColor: '#334155',
    },
    progressBarContainer: {
        height: 3,
        backgroundColor: '#E5E7EB',
        width: '100%',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#6366f1',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        paddingVertical: 10,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    iconContainerDark: {
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
    },
    textDark: {
        color: '#fff',
    },
    timeInfo: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 12,
    },
    controlButton: {
        padding: 4,
    }
});

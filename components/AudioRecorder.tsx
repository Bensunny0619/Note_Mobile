import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

type AudioRecorderProps = {
    onAudioRecorded: (uri: string) => void;
    onAudioDeleted?: () => void;
    existingAudioUri?: string;
    autoStart?: boolean;
};

export default function AudioRecorder({ onAudioRecorded, onAudioDeleted, existingAudioUri, autoStart }: AudioRecorderProps) {
    const { isDarkMode } = useTheme();

    return (
        <View style={styles.container}>
            <View style={[styles.mockContainer, isDarkMode && styles.mockContainerDark]}>
                <Text style={[styles.mockText, isDarkMode && styles.textDark]}>
                    Audio recording is not available on web preview.
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 12,
    },
    mockContainer: {
        backgroundColor: '#F3F4F6',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    mockContainerDark: {
        backgroundColor: '#1e293b',
    },
    mockText: {
        color: '#6B7280',
        fontSize: 14,
    },
    textDark: {
        color: '#94a3b8',
    },
});

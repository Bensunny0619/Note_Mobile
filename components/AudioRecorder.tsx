import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

type AudioRecorderProps = {
    onAudioRecorded: (uri: string) => void;
    onAudioDeleted?: () => void;
    existingAudioUri?: string;
};

export default function AudioRecorder({ onAudioRecorded, onAudioDeleted, existingAudioUri }: AudioRecorderProps) {
    const { isDarkMode } = useTheme();
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioUri, setAudioUri] = useState<string | undefined>(existingAudioUri);
    const [recordingDuration, setRecordingDuration] = useState(0);

    const startRecording = async () => {
        try {
            // Clean up any existing recording first
            if (recording) {
                try {
                    await recording.stopAndUnloadAsync();
                } catch (e) {
                    console.log('Error cleaning up previous recording:', e);
                }
                setRecording(null);
            }

            const permission = await Audio.requestPermissionsAsync();
            if (permission.status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant microphone permissions to record audio.');
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording: newRecording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );

            setRecording(newRecording);
            setIsRecording(true);
            setRecordingDuration(0);

            // Update duration every second
            const interval = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);

            newRecording.setOnRecordingStatusUpdate((status) => {
                if (!status.isRecording) {
                    clearInterval(interval);
                }
            });
        } catch (err) {
            console.error('Failed to start recording', err);
            Alert.alert('Error', 'Failed to start recording');
        }
    };

    const stopRecording = async () => {
        if (!recording) return;

        try {
            setIsRecording(false);
            await recording.stopAndUnloadAsync();
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
            });

            const uri = recording.getURI();
            if (uri) {
                setAudioUri(uri);
                onAudioRecorded(uri);
            }
            setRecording(null);
        } catch (err) {
            console.error('Failed to stop recording', err);
        }
    };

    const playSound = async () => {
        if (!audioUri) return;

        try {
            if (sound) {
                await sound.unloadAsync();
            }

            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: audioUri },
                { shouldPlay: true }
            );

            setSound(newSound);
            setIsPlaying(true);

            newSound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    setIsPlaying(false);
                }
            });

            await newSound.playAsync();
        } catch (err) {
            console.error('Failed to play sound', err);
            Alert.alert('Error', 'Failed to play audio');
        }
    };

    const stopSound = async () => {
        if (sound) {
            await sound.stopAsync();
            setIsPlaying(false);
        }
    };

    const deleteAudio = () => {
        setAudioUri(undefined);
        setRecordingDuration(0);
        if (onAudioDeleted) {
            onAudioDeleted();
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    React.useEffect(() => {
        return () => {
            if (sound) {
                sound.unloadAsync().catch(() => { });
            }
            if (recording) {
                recording.stopAndUnloadAsync().catch(() => {
                    // Ignore errors if already unloaded
                });
            }
        };
    }, [sound, recording]);

    return (
        <View style={styles.container}>
            {!audioUri ? (
                <View style={styles.recordingContainer}>
                    {isRecording ? (
                        <View style={styles.recordingActive}>
                            <View style={styles.recordingIndicator}>
                                <View style={styles.recordingDot} />
                                <Text style={[styles.recordingText, isDarkMode && styles.textDark]}>
                                    Recording... {formatDuration(recordingDuration)}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.stopButton, isDarkMode && styles.buttonDark]}
                                onPress={stopRecording}
                            >
                                <Feather name="square" size={20} color="#EF4444" />
                                <Text style={styles.stopButtonText}>Stop</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={[styles.recordButton, isDarkMode && styles.buttonDark]}
                            onPress={startRecording}
                        >
                            <Feather name="mic" size={20} color="#6366f1" />
                            <Text style={styles.recordButtonText}>Record Audio Note</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <View style={[styles.audioPlayer, isDarkMode && styles.audioPlayerDark]}>
                    <TouchableOpacity
                        style={styles.playButton}
                        onPress={isPlaying ? stopSound : playSound}
                    >
                        <Feather name={isPlaying ? "pause" : "play"} size={24} color="#6366f1" />
                    </TouchableOpacity>
                    <View style={styles.audioInfo}>
                        <Text style={[styles.audioLabel, isDarkMode && styles.textDark]}>Audio Note</Text>
                        <Text style={[styles.audioDuration, isDarkMode && styles.textDark]}>
                            {formatDuration(recordingDuration)}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={deleteAudio}>
                        <Feather name="trash-2" size={20} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 12,
    },
    recordingContainer: {
        width: '100%',
    },
    recordingActive: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FEF2F2',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    recordingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    recordingDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#EF4444',
    },
    recordingText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    recordButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EEF2FF',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        gap: 8,
    },
    recordButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6366f1',
    },
    stopButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEE2E2',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        gap: 6,
    },
    stopButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#EF4444',
    },
    audioPlayer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 12,
        gap: 12,
    },
    audioPlayerDark: {
        backgroundColor: '#1e293b',
    },
    playButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
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
    buttonDark: {
        backgroundColor: '#1e293b',
    },
    textDark: {
        color: '#f8fafc',
    },
});

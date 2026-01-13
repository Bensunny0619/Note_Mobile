import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { Alert } from 'react-native';

type AudioMetadata = {
    noteId: string | number;
    title: string;
    duration?: number;
};

type AudioContextType = {
    isPlaying: boolean;
    currentUri: string | null;
    metadata: AudioMetadata | null;
    position: number;
    duration: number;
    isLoading: boolean;
    playAudio: (uri: string, meta: AudioMetadata) => Promise<void>;
    pauseAudio: () => Promise<void>;
    resumeAudio: () => Promise<void>;
    stopAudio: () => Promise<void>;
};

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentUri, setCurrentUri] = useState<string | null>(null);
    const [metadata, setMetadata] = useState<AudioMetadata | null>(null);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // Clean up sound on unmount
    useEffect(() => {
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, [sound]);

    // Setup audio session
    useEffect(() => {
        async function setupAudio() {
            try {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: false,
                    playsInSilentModeIOS: true,
                    staysActiveInBackground: true, // Crucial for persistent playback
                    shouldDuckAndroid: true,
                    playThroughEarpieceAndroid: false,
                });
            } catch (error) {
                console.error('Failed to setup audio mode', error);
            }
        }
        setupAudio();
    }, []);

    const onPlaybackStatusUpdate = (status: any) => {
        if (status.isLoaded) {
            setPosition(status.positionMillis);
            setDuration(status.durationMillis || 0);
            setIsPlaying(status.isPlaying);

            if (status.didJustFinish) {
                setIsPlaying(false);
                setPosition(0);
                sound?.setPositionAsync(0);
                sound?.pauseAsync(); // Stop at end
            }
        }
    };

    const playAudio = async (uri: string, meta: AudioMetadata) => {
        try {
            setIsLoading(true);

            // If same URI, toggle play/pause
            if (currentUri === uri && sound) {
                if (isPlaying) {
                    await sound.pauseAsync();
                } else {
                    await sound.playAsync();
                }
                setIsLoading(false);
                return;
            }

            // Unload existing sound
            if (sound) {
                await sound.unloadAsync();
                setSound(null);
            }

            // Load new sound
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri },
                { shouldPlay: true },
                onPlaybackStatusUpdate
            );

            setSound(newSound);
            setCurrentUri(uri);
            setMetadata(meta);
            setIsLoading(false);
        } catch (error) {
            console.error('Error playing audio', error);
            Alert.alert('Error', 'Could not play audio');
            setIsLoading(false);
        }
    };

    const pauseAudio = async () => {
        if (sound) {
            await sound.pauseAsync();
        }
    };

    const resumeAudio = async () => {
        if (sound) {
            await sound.playAsync();
        }
    };

    const stopAudio = async () => {
        if (sound) {
            await sound.stopAsync();
            await sound.unloadAsync();
            setSound(null);
            setCurrentUri(null);
            setMetadata(null);
            setIsPlaying(false);
            setPosition(0);
            setDuration(0);
        }
    };

    const value = {
        isPlaying,
        currentUri,
        metadata,
        position,
        duration,
        isLoading,
        playAudio,
        pauseAudio,
        resumeAudio,
        stopAudio
    };

    return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useAudio() {
    const context = useContext(AudioContext);
    if (!context) {
        throw new Error('useAudio must be used within an AudioProvider');
    }
    return context;
}

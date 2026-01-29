import React, { createContext, useContext, useState } from 'react';

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
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentUri, setCurrentUri] = useState<string | null>(null);
    const [metadata, setMetadata] = useState<AudioMetadata | null>(null);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const playAudio = async (uri: string, meta: AudioMetadata) => {
        console.log('🔇 Audio playback is currently mocked on web to silence expo-av warnings.');
        setCurrentUri(uri);
        setMetadata(meta);
    };

    const pauseAudio = async () => {
        setIsPlaying(false);
    };

    const resumeAudio = async () => {
        setIsPlaying(true);
    };

    const stopAudio = async () => {
        setCurrentUri(null);
        setMetadata(null);
        setIsPlaying(false);
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

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import authStorage from '../services/authStorage';

type ThemeColors = {
    primary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
    card: string;
    placeholder: string;
    divider: string;
};

type ThemeContextType = {
    isDarkMode: boolean;
    toggleTheme: () => void;
    colors: ThemeColors;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const LightTheme: ThemeColors = {
    primary: '#6366f1',
    background: '#FFFFFF',
    surface: '#F3F4F6',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    error: '#EF4444',
    success: '#10B981',
    card: '#FFFFFF',
    placeholder: '#9CA3AF',
    divider: '#E5E7EB',
};

const DarkTheme: ThemeColors = {
    primary: '#818cf8', // Slightly lighter indigo for dark mode
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f8fafc',
    textSecondary: '#94a3b8',
    border: '#334155',
    error: '#f87171',
    success: '#34d399',
    card: '#1e293b',
    placeholder: '#475569',
    divider: '#334155',
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { colorScheme, setColorScheme } = useNativeWindColorScheme();
    const [isDarkMode, setIsDarkMode] = useState(colorScheme === 'dark');

    useEffect(() => {
        async function loadTheme() {
            const savedTheme = await authStorage.getItem('theme_preference');
            if (savedTheme) {
                const isDark = savedTheme === 'dark';
                setIsDarkMode(isDark);
                setColorScheme(isDark ? 'dark' : 'light');
            } else {
                setIsDarkMode(colorScheme === 'dark');
            }
        }
        loadTheme();
    }, []);

    const toggleTheme = async () => {
        const newTheme = !isDarkMode ? 'dark' : 'light';
        setIsDarkMode(!isDarkMode);
        setColorScheme(newTheme);
        await authStorage.setItem('theme_preference', newTheme);
    };

    const colors = isDarkMode ? DarkTheme : LightTheme;

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleTheme, colors }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

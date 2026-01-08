import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import * as SecureStore from 'expo-secure-store';

type ThemeContextType = {
    isDarkMode: boolean;
    toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { colorScheme, setColorScheme } = useNativeWindColorScheme();
    const [isDarkMode, setIsDarkMode] = useState(colorScheme === 'dark');

    useEffect(() => {
        async function loadTheme() {
            const savedTheme = await SecureStore.getItemAsync('theme_preference');
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
        await SecureStore.setItemAsync('theme_preference', newTheme);
    };

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
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

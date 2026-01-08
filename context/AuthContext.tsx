import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { router } from 'expo-router';

type User = {
    id: number;
    name: string;
    email: string;
};

type AuthContextType = {
    user: User | null;
    isLoading: boolean;
    login: (token: string, user: User) => Promise<void>;
    logout: () => Promise<void>;
    register: (token: string, user: User) => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: true,
    login: async () => { },
    logout: async () => { },
    register: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkLoginStatus();
    }, []);

    const checkLoginStatus = async () => {
        try {
            const token = await SecureStore.getItemAsync('auth_token');
            const userData = await SecureStore.getItemAsync('user_data');

            if (token && userData) {
                setUser(JSON.parse(userData));
                // Verify token validity with backend if needed, or rely on 401 interceptor
            }
        } catch (e) {
            console.error('Failed to load auth state', e);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (token: string, newUser: User) => {
        try {
            if (!token || typeof token !== 'string') {
                console.error('Invalid token provided to login:', token);
                throw new Error('Authentication failed: Missing token');
            }

            await SecureStore.setItemAsync('auth_token', token);
            await SecureStore.setItemAsync('user_data', JSON.stringify(newUser));
            setUser(newUser);

            router.replace('/(tabs)');
        } catch (e) {
            console.error('Login error', e);
            throw e;
        }
    };

    const register = async (token: string, newUser: User) => {
        // Registration often logs the user in automatically
        await login(token, newUser);
    };

    const logout = async () => {
        try {
            await SecureStore.deleteItemAsync('auth_token');
            await SecureStore.deleteItemAsync('user_data');
            setUser(null);

            // Navigate to login
            router.replace('/(auth)/login');
        } catch (e) {
            console.error('Logout error', e);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, register }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

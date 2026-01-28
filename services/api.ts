import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import API_CONFIG from './config';

const api = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    timeout: API_CONFIG.TIMEOUT,
});

// Add a request interceptor to add the token to requests
api.interceptors.request.use(
    async (config) => {
        const token = await SecureStore.getItemAsync('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle 401 errors
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            console.log('--- SESSION EXPIRED / UNAUTHENTICATED ---');
            console.log('🔄 Clearing auth data and redirecting to login...');

            // Clear all authentication data
            await SecureStore.deleteItemAsync('auth_token');
            await SecureStore.deleteItemAsync('user_data');

            // Redirect to login screen
            try {
                router.replace('/(auth)/login');
            } catch (navError) {
                console.error('Navigation error:', navError);
            }
        }
        return Promise.reject(error);
    }
);

export default api;

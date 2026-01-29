import axios from 'axios';
import authStorage from './authStorage';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import API_CONFIG from './config';

const api = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    timeout: API_CONFIG.TIMEOUT,
});

console.log('🌐 API Base URL:', API_CONFIG.BASE_URL);
if (Platform.OS === 'web') {
    console.log('🖥️ Running on Web. CORS and Origin checks may apply.');
}

// Add a request interceptor to add the token to requests
api.interceptors.request.use(
    async (config) => {
        const token = await authStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response) {
            console.error('❌ API Error Response:', {
                status: error.response.status,
                data: error.response.data,
                url: error.config?.url,
            });

            if (error.response.status === 401) {
                const token = await authStorage.getItem('auth_token');
                if (token) {
                    console.log('--- SESSION EXPIRED / UNAUTHENTICATED ---');
                    console.log('🔄 Clearing auth data and redirecting to login...');

                    // Clear all authentication data
                    await authStorage.deleteItem('auth_token');
                    await authStorage.deleteItem('user_data');

                    // Redirect to login screen
                    try {
                        router.replace('/(auth)/login');
                    } catch (navError) {
                        console.error('Navigation error:', navError);
                    }
                }
            }
        } else if (error.request) {
            console.error('❌ API No Response:', {
                request: 'No response received from server',
                url: error.config?.url,
                baseUrl: API_CONFIG.BASE_URL,
            });
        } else {
            console.error('❌ API Request Setup Error:', error.message);
        }
        return Promise.reject(error);
    }
);

export default api;

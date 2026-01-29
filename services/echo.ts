import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import API_CONFIG from './config';

// We need to define Pusher globally for Laravel Echo to find it
if (typeof window !== 'undefined') {
    // @ts-ignore
    window.Pusher = Pusher;
}

export const createEcho = (token: string) => {
    return new Echo({
        broadcaster: 'reverb',
        key: 'reverb_app_key',
        wsHost: API_CONFIG.REVERB_HOST,
        wsPort: 9000,
        wssPort: 9000,
        forceTLS: false,
        enabledTransports: ['ws', 'wss'],

        // Custom Auth Endpoint
        authEndpoint: `${API_CONFIG.BASE_URL}/broadcasting/auth`,
        auth: {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
            },
        },
    });
};

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// We need to define Pusher globally for Laravel Echo to find it
// @ts-ignore
window.Pusher = Pusher;

export const createEcho = (token: string) => {
    return new Echo({
        broadcaster: 'reverb',
        key: 'reverb_app_key',
        wsHost: '192.168.0.2',
        wsPort: 9000,
        wssPort: 9000,
        forceTLS: false,
        enabledTransports: ['ws', 'wss'],

        // Custom Auth Endpoint
        authEndpoint: 'http://192.168.0.2:8000/api/broadcasting/auth',
        auth: {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
            },
        },
    });
};

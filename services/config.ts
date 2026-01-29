import { Platform } from 'react-native';

const DEV_IP = '192.168.0.3'; // Update this to your local IP for mobile dev

export const API_CONFIG = {
    BASE_URL: Platform.select({
        web: 'http://localhost:8000/api',
        default: `http://${DEV_IP}:8000/api`,
    }),
    REVERB_HOST: DEV_IP,
    TIMEOUT: 60000,
};

export default API_CONFIG;

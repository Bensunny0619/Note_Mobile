import React, { createContext, useContext, useEffect, useState } from 'react';
import { createEcho } from '../services/echo';
import { useAuth } from './AuthContext';
import { useNetwork } from './NetworkContext';
import * as offlineApi from '../services/offlineApi';
import { addCachedNote, updateCachedNote, removeCachedNote, getCachedNoteById } from '../services/storage';

interface WebSocketContextType {
    isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType>({
    isConnected: false,
});

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, token } = useAuth();
    const { triggerSync } = useNetwork(); // Using triggerSync to signal UI refresh
    const [echo, setEcho] = useState<any>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Only connect if we have a user and token
        if (user && token && !echo) {
            console.log('🔌 Initializing WebSocket connection...');

            const echoInstance = createEcho(token);
            setEcho(echoInstance);

            // Subscribe to User's private channel
            // According to backend: App.Models.User.{id}
            const channelName = `App.Models.User.${user.id}`;
            console.log(`📡 Subscribing to channel: ${channelName}`);

            const channel = echoInstance.private(channelName);

            channel.listen('.note.created', async (e: any) => {
                console.log('⚡ Event Received: note.created', e.note.id);
                // Check if we already have this note (to avoid echo from our own offline create)
                const existing = await getCachedNoteById(e.note.id);
                if (!existing) {
                    await addCachedNote({
                        id: e.note.id,
                        data: e.note,
                        locallyModified: false,
                        lastSyncedAt: new Date().toISOString()
                    });
                    triggerSync(true);
                }
            });

            channel.listen('.note.updated', async (e: any) => {
                console.log('⚡ Event Received: note.updated', e.note.id);
                await updateCachedNote(e.note.id, {
                    data: e.note,
                    locallyModified: false,
                    lastSyncedAt: new Date().toISOString()
                });
                triggerSync(true);
            });

            channel.listen('.note.deleted', async (e: any) => {
                console.log('⚡ Event Received: note.deleted', e.noteId);
                await removeCachedNote(e.noteId);
                triggerSync(true);
            });

            // Connection status helpers (Pusher specific)
            echoInstance.connector.pusher.connection.bind('connected', () => {
                console.log('✅ WebSocket Connected');
                setIsConnected(true);
            });

            echoInstance.connector.pusher.connection.bind('disconnected', () => {
                console.log('❌ WebSocket Disconnected');
                setIsConnected(false);
            });
        }

        // Cleanup on unmount or logout
        return () => {
            if (echo && (!user || !token)) {
                console.log('🔌 Disconnecting WebSocket...');
                echo.disconnect();
                setEcho(null);
                setIsConnected(false);
            }
        };
    }, [user, token]);

    return (
        <WebSocketContext.Provider value={{ isConnected }}>
            {children}
        </WebSocketContext.Provider>
    );
};

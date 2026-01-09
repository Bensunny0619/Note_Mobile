import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { processSyncQueue } from '../services/syncQueue';
import { setGlobalOnlineStatus } from '../services/offlineApi';

interface NetworkContextType {
    isOnline: boolean;
    isInitializing: boolean;
    lastSync: Date | null;
    pendingCount: number;
    triggerSync: (forceRefresh?: boolean) => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType>({
    isOnline: true,
    isInitializing: true,
    lastSync: null,
    pendingCount: 0,
    triggerSync: async () => { },
});

export const useNetwork = () => useContext(NetworkContext);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOnline, setIsOnline] = useState(true);
    const [isInitializing, setIsInitializing] = useState(true);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);

    const triggerSync = useCallback(async (forceRefresh = false) => {
        // Allow forcing a timestamp update even if offline or syncing (for WebSockets)
        if (forceRefresh) {
            setLastSync(new Date());
        }

        if (!isOnline || isSyncing) return;

        setIsSyncing(true);
        try {
            const { successful, failed, remaining } = await processSyncQueue();
            setPendingCount(remaining);

            if (successful > 0 || forceRefresh) {
                setLastSync(new Date());
                if (successful > 0) {
                    console.log(`✅ Sync complete: ${successful} successful, ${failed} failed`);
                }
            }
        } catch (error) {
            console.error('Sync failed:', error);
        } finally {
            setIsSyncing(false);
        }
    }, [isOnline, isSyncing]);

    useEffect(() => {
        // Subscribe to network state changes
        const unsubscribe = NetInfo.addEventListener(state => {
            const online = state.isConnected ?? false;
            const wasOffline = !isOnline;

            setIsOnline(online);
            setGlobalOnlineStatus(online); // Sync with offline API
            setIsInitializing(false);

            // Trigger sync when coming back online
            if (online && wasOffline && !isSyncing) {
                console.log('🌐 Back online, triggering sync...');
                triggerSync();
            }
        });

        // Initial check
        NetInfo.fetch().then(state => {
            const online = state.isConnected ?? false;
            setIsOnline(online);
            setGlobalOnlineStatus(online); // Sync with offline API
            setIsInitializing(false);
        });

        return () => unsubscribe();
    }, [isOnline, isSyncing, triggerSync]);

    return (
        <NetworkContext.Provider value={{ isOnline, isInitializing, lastSync, pendingCount, triggerSync }}>
            {children}
        </NetworkContext.Provider>
    );
};

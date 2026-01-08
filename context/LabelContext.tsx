import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

type Label = {
    id: number;
    name: string;
    user_id: number;
    created_at: string;
    updated_at: string;
};

type LabelContextType = {
    labels: Label[];
    loading: boolean;
    fetchLabels: () => Promise<void>;
    createLabel: (name: string) => Promise<Label>;
    deleteLabel: (id: number) => Promise<void>;
    updateLabel: (id: number, name: string) => Promise<void>;
};

const LabelContext = createContext<LabelContextType | undefined>(undefined);

export function LabelProvider({ children }: { children: React.ReactNode }) {
    const [labels, setLabels] = useState<Label[]>([]);
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();

    const fetchLabels = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const response = await api.get('/labels');
            // Assuming response looks like { data: [...] } or just [...]
            setLabels(Array.isArray(response.data) ? response.data : response.data?.data || []);
        } catch (error) {
            console.error('Error fetching labels:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    const createLabel = async (name: string) => {
        try {
            const response = await api.post('/labels', { name });
            const newLabel = response.data;
            setLabels(prev => [...prev, newLabel]);
            return newLabel;
        } catch (error) {
            console.error('Error creating label:', error);
            throw error;
        }
    };

    const deleteLabel = async (id: number) => {
        try {
            await api.delete(`/labels/${id}`);
            setLabels(prev => prev.filter(l => l.id !== id));
        } catch (error) {
            console.error('Error deleting label:', error);
            throw error;
        }
    };

    const updateLabel = async (id: number, name: string) => {
        try {
            await api.put(`/labels/${id}`, { name });
            setLabels(prev => prev.map(l => l.id === id ? { ...l, name } : l));
        } catch (error) {
            console.error('Error updating label:', error);
            throw error;
        }
    };

    useEffect(() => {
        fetchLabels();
    }, [fetchLabels]);

    return (
        <LabelContext.Provider value={{ labels, loading, fetchLabels, createLabel, deleteLabel, updateLabel }}>
            {children}
        </LabelContext.Provider>
    );
}

export function useLabels() {
    const context = useContext(LabelContext);
    if (context === undefined) {
        throw new Error('useLabels must be used within a LabelProvider');
    }
    return context;
}

import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Dimensions,
    Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface ConflictResolverProps {
    visible: boolean;
    localNote: any;
    serverNote: any;
    onResolve: (resolvedNote: any) => void;
    onCancel: () => void;
}

const { width } = Dimensions.get('window');

export default function ConflictResolver({
    visible,
    localNote,
    serverNote,
    onResolve,
    onCancel
}: ConflictResolverProps) {
    const { isDarkMode } = useTheme();
    const [selectedVersion, setSelectedVersion] = useState<'local' | 'server' | null>(null);

    const handleResolve = () => {
        if (!selectedVersion) return;
        const resolved = selectedVersion === 'local' ? localNote : serverNote;
        onResolve(resolved);
    };

    if (!visible) return null;

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onCancel}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, isDarkMode && styles.modalContentDark]}>
                    <View style={styles.header}>
                        <Feather name="alert-triangle" size={24} color="#F59E0B" />
                        <Text style={[styles.title, isDarkMode && styles.textDark]}>
                            Sync Conflict Detected
                        </Text>
                        <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
                            <Feather name="x" size={24} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.subtitle, isDarkMode && styles.textDarkSecondary]}>
                        This note was modified on another device. Which version would you like to keep?
                    </Text>

                    <ScrollView style={styles.versionsContainer} horizontal showsHorizontalScrollIndicator={false}>
                        {/* Local Version */}
                        <TouchableOpacity
                            style={[
                                styles.versionCard,
                                isDarkMode && styles.versionCardDark,
                                selectedVersion === 'local' && styles.selectedCard
                            ]}
                            onPress={() => setSelectedVersion('local')}
                        >
                            <View style={styles.versionHeader}>
                                <Text style={[styles.versionTitle, isDarkMode && styles.textDark]}>
                                    Your Version (Offline)
                                </Text>
                                <Text style={styles.timestamp}>
                                    {new Date(localNote.updated_at || Date.now()).toLocaleTimeString()}
                                </Text>
                            </View>
                            <Text style={[styles.noteTitle, isDarkMode && styles.textDark]}>
                                {localNote.title}
                            </Text>
                            <Text style={[styles.noteContent, isDarkMode && styles.textDarkSecondary]} numberOfLines={6}>
                                {localNote.content}
                            </Text>
                        </TouchableOpacity>

                        {/* Server Version */}
                        <TouchableOpacity
                            style={[
                                styles.versionCard,
                                isDarkMode && styles.versionCardDark,
                                selectedVersion === 'server' && styles.selectedCard
                            ]}
                            onPress={() => setSelectedVersion('server')}
                        >
                            <View style={styles.versionHeader}>
                                <Text style={[styles.versionTitle, isDarkMode && styles.textDark]}>
                                    Server Version
                                </Text>
                                <Text style={styles.timestamp}>
                                    {new Date(serverNote.updated_at).toLocaleTimeString()}
                                </Text>
                            </View>
                            <Text style={[styles.noteTitle, isDarkMode && styles.textDark]}>
                                {serverNote.title}
                            </Text>
                            <Text style={[styles.noteContent, isDarkMode && styles.textDarkSecondary]} numberOfLines={6}>
                                {serverNote.content}
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.resolveButton, !selectedVersion && styles.disabledButton]}
                            onPress={handleResolve}
                            disabled={!selectedVersion}
                        >
                            <Text style={styles.resolveButtonText}>
                                Keep Selected Version
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        padding: 16,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        maxHeight: '80%',
        width: '100%',
        elevation: 5,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
            },
            web: {
                boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
            }
        }),
    },
    modalContentDark: {
        backgroundColor: '#1E293B',
        borderColor: '#334155',
        borderWidth: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        flex: 1,
    },
    textDark: {
        color: '#F3F4F6',
    },
    textDarkSecondary: {
        color: '#9CA3AF',
    },
    subtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 24,
    },
    closeButton: {
        padding: 4,
    },
    versionsContainer: {
        marginBottom: 24,
    },
    versionCard: {
        width: width * 0.65,
        backgroundColor: '#F9FAFB',
        padding: 16,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        marginRight: 16,
    },
    versionCardDark: {
        backgroundColor: '#0F172A',
        borderColor: '#334155',
    },
    selectedCard: {
        borderColor: '#6366F1',
        backgroundColor: '#EEF2FF',
    },
    versionHeader: {
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        paddingBottom: 8,
    },
    versionTitle: {
        fontWeight: '700',
        fontSize: 14,
        color: '#374151',
    },
    timestamp: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2,
    },
    noteTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
        color: '#111827',
    },
    noteContent: {
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 20,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    resolveButton: {
        backgroundColor: '#6366F1',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: '#E5E7EB',
        opacity: 0.7,
    },
    resolveButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 16,
    },
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLabels } from '../../context/LabelContext';
import { useTheme } from '../../context/ThemeContext';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function LabelsScreen() {
    const { labels, createLabel, updateLabel, deleteLabel, loading } = useLabels();
    const { isDarkMode } = useTheme();
    const router = useRouter();
    const [newLabelName, setNewLabelName] = useState('');
    const [editingLabelId, setEditingLabelId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const handleCreateLabel = async () => {
        if (!newLabelName.trim()) return;
        setActionLoading(true);
        try {
            await createLabel(newLabelName.trim());
            setNewLabelName('');
        } catch (error) {
            Alert.alert('Error', 'Failed to create label');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateLabel = async (id: number) => {
        if (!editingName.trim()) return;
        setActionLoading(true);
        try {
            await updateLabel(id, editingName.trim());
            setEditingLabelId(null);
            setEditingName('');
        } catch (error) {
            Alert.alert('Error', 'Failed to update label');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteLabel = (id: number) => {
        Alert.alert(
            'Delete Label',
            'Are you sure you want to delete this label? Notes with this label will not be deleted.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setActionLoading(true);
                        try {
                            await deleteLabel(id);
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete label');
                        } finally {
                            setActionLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const startEditing = (label: any) => {
        setEditingLabelId(label.id);
        setEditingName(label.name);
    };

    return (
        <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
            <View style={[styles.header, isDarkMode && styles.headerDark]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color={isDarkMode ? '#e2e8f0' : '#1f2937'} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, isDarkMode && styles.textDark]}>Edit labels</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Create New Label */}
                <View style={[styles.inputContainer, isDarkMode && styles.inputContainerDark]}>
                    <Feather name="plus" size={24} color={isDarkMode ? '#94a3b8' : '#5f6368'} style={styles.inputIcon} />
                    <TextInput
                        style={[styles.input, isDarkMode && styles.textDark]}
                        placeholder="Create new label"
                        placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'}
                        value={newLabelName}
                        onChangeText={setNewLabelName}
                        onSubmitEditing={handleCreateLabel}
                        returnKeyType="done"
                    />
                    {newLabelName.length > 0 && (
                        <TouchableOpacity onPress={handleCreateLabel} disabled={actionLoading}>
                            <Feather name="check" size={24} color="#6366f1" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Existing Labels */}
                {labels.map((label: any) => (
                    <View key={label.id} style={[styles.itemContainer, isDarkMode && styles.itemContainerDark]}>
                        {editingLabelId === label.id ? (
                            <>
                                <MaterialIcons name="label-outline" size={24} color={isDarkMode ? '#94a3b8' : '#5f6368'} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, isDarkMode && styles.textDark]}
                                    value={editingName}
                                    onChangeText={setEditingName}
                                    autoFocus
                                    onBlur={() => handleUpdateLabel(label.id)}
                                    onSubmitEditing={() => handleUpdateLabel(label.id)}
                                    returnKeyType="done"
                                />
                                <TouchableOpacity onPress={() => handleUpdateLabel(label.id)} disabled={actionLoading}>
                                    <Feather name="check" size={24} color="#6366f1" />
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <MaterialIcons name="label-outline" size={24} color={isDarkMode ? '#94a3b8' : '#5f6368'} style={styles.inputIcon} />
                                <Text style={[styles.labelText, isDarkMode && styles.textDark]} numberOfLines={1}>
                                    {label.name}
                                </Text>
                                <TouchableOpacity onPress={() => startEditing(label)} style={styles.editIcon}>
                                    <Feather name="edit-2" size={20} color={isDarkMode ? '#94a3b8' : '#5f6368'} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDeleteLabel(label.id)} disabled={actionLoading}>
                                    <Feather name="trash-2" size={20} color="#EF4444" />
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                ))}
            </ScrollView>

            {actionLoading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#6366f1" />
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    containerDark: {
        backgroundColor: '#0f172a',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    headerDark: {
        borderBottomColor: '#334155',
    },
    backButton: {
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '500',
        color: '#1f2937',
    },
    content: {
        padding: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        marginBottom: 8,
    },
    inputContainerDark: {
        borderBottomColor: '#334155',
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    itemContainerDark: {
        // borderBottomColor: '#334155',
    },
    inputIcon: {
        marginRight: 16,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#1f2937',
        padding: 0,
    },
    labelText: {
        flex: 1,
        fontSize: 16,
        color: '#1f2937',
    },
    textDark: {
        color: '#f8fafc',
    },
    editIcon: {
        marginRight: 16,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    Alert,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useLabels } from '../../context/LabelContext';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export default function ManageLabels() {
    const { labels, createLabel, deleteLabel, updateLabel, loading } = useLabels();
    const [newLabelName, setNewLabelName] = useState('');
    const [editingLabelId, setEditingLabelId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const { isDarkMode } = useTheme();
    const router = useRouter();

    const handleCreate = async () => {
        if (!newLabelName.trim()) return;
        setIsCreating(true);
        try {
            await createLabel(newLabelName.trim());
            setNewLabelName('');
        } catch (error) {
            Alert.alert('Error', 'Failed to create label');
        } finally {
            setIsCreating(false);
        }
    };

    const startEditing = (label: any) => {
        setEditingLabelId(label.id);
        setEditingName(label.name);
    };

    const handleUpdate = async () => {
        if (!editingLabelId || !editingName.trim()) return;
        try {
            await updateLabel(editingLabelId, editingName.trim());
            setEditingLabelId(null);
        } catch (error) {
            Alert.alert('Error', 'Failed to update label');
        }
    };

    const confirmDelete = (id: number) => {
        Alert.alert(
            'Delete Label',
            'All notes with this label will lose the association. Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteLabel(id) }
            ]
        );
    };

    const renderLabelItem = ({ item }: { item: any }) => (
        <View style={styles.labelItem}>
            {editingLabelId === item.id ? (
                <View style={[styles.editRow, isDarkMode && styles.editRowDark]}>
                    <TextInput
                        style={[styles.editInput, isDarkMode && styles.textDark]}
                        value={editingName}
                        onChangeText={setEditingName}
                        autoFocus
                        onSubmitEditing={handleUpdate}
                    />
                    <TouchableOpacity onPress={handleUpdate} style={styles.iconButton}>
                        <Feather name="check" size={20} color="#10B981" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setEditingLabelId(null)} style={styles.iconButton}>
                        <Feather name="x" size={20} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={[styles.displayRow, isDarkMode ? styles.inputBarDark : { backgroundColor: '#F9FAFB' }]}>
                    <View style={[styles.labelIconWrapper, isDarkMode && styles.labelIconWrapperDark]}>
                        <Feather name="tag" size={16} color="#6366f1" />
                    </View>
                    <Text style={[styles.labelText, isDarkMode && styles.textDark]}>{item.name}</Text>
                    <TouchableOpacity onPress={() => startEditing(item)} style={styles.iconButton}>
                        <Feather name="edit-2" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmDelete(item.id)} style={styles.iconButton}>
                        <Feather name="trash-2" size={18} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
            <View style={[styles.header, isDarkMode && styles.headerDark]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Feather name="chevron-left" size={28} color={isDarkMode ? "#94a3b8" : "#374151"} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, isDarkMode && styles.textDark]}>Manage Labels</Text>
                <View style={{ width: 44 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.createContainer}>
                    <View style={[styles.inputBar, isDarkMode && styles.inputBarDark]}>
                        <TextInput
                            style={[styles.input, isDarkMode && styles.textDark]}
                            placeholder="Create new label..."
                            placeholderTextColor={isDarkMode ? "#475569" : "#9CA3AF"}
                            value={newLabelName}
                            onChangeText={setNewLabelName}
                            onSubmitEditing={handleCreate}
                        />
                        <TouchableOpacity
                            onPress={handleCreate}
                            disabled={isCreating}
                            style={styles.createButton}
                        >
                            {isCreating ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Feather name="plus" size={24} color="white" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {loading && labels.length === 0 ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color="#6366f1" />
                    </View>
                ) : (
                    <FlatList
                        data={labels}
                        renderItem={renderLabelItem}
                        keyExtractor={item => item.id.toString()}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <View style={[styles.emptyIconCircle, isDarkMode && styles.labelIconWrapperDark]}>
                                    <Feather name="tag" size={40} color="#6366f1" />
                                </View>
                                <Text style={[styles.emptyTitle, isDarkMode && styles.textDark]}>No labels yet</Text>
                                <Text style={[styles.emptySubtitle, isDarkMode && { color: '#475569' }]}>Labels help you organize and find your notes faster.</Text>
                            </View>
                        }
                    />
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 60,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    containerDark: {
        backgroundColor: '#0f172a',
    },
    headerDark: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    textDark: {
        color: '#f8fafc',
    },
    inputBarDark: {
        backgroundColor: '#1e293b',
    },
    editRowDark: {
        backgroundColor: '#1e293b',
        borderColor: '#334155',
    },
    labelIconWrapperDark: {
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
    },
    createContainer: {
        padding: 24,
    },
    inputBar: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 16,
        padding: 4,
        alignItems: 'center',
    },
    input: {
        flex: 1,
        paddingHorizontal: 16,
        height: 48,
        fontSize: 16,
        color: '#1F2937',
        fontWeight: '500',
    },
    createButton: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#6366f1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    labelItem: {
        marginBottom: 12,
    },
    displayRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 14,
    },
    labelIconWrapper: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    labelText: {
        flex: 1,
        fontSize: 16,
        color: '#374151',
        fontWeight: '600',
    },
    iconButton: {
        padding: 8,
        marginLeft: 4,
    },
    editRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 8,
        borderRadius: 14,
        elevation: 2,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            web: {
                boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
            }
        }),
    },
    editInput: {
        flex: 1,
        fontSize: 16,
        color: '#1F2937',
        fontWeight: '600',
        paddingHorizontal: 12,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        paddingHorizontal: 40,
        lineHeight: 20,
    }
});

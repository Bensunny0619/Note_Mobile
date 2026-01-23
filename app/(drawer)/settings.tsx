import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Modal, ActivityIndicator, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { clearAllCache } from '../../services/storage';
import { exportNotesAsJSON, exportNotesAsText } from '../../services/export';

export default function Settings() {
    const { isDarkMode, toggleTheme } = useTheme();
    const { user, logout } = useAuth();
    const router = useRouter();
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [syncNotifications, setSyncNotifications] = useState(false);
    const [isExportModalVisible, setIsExportModalVisible] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const handleClearCache = () => {
        Alert.alert(
            'Clear Cache',
            'This will clear all cached data. Your notes will be re-downloaded from the server.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: async () => {
                        await clearAllCache();
                        Alert.alert('Success', 'Cache cleared successfully');
                    }
                }
            ]
        );
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: logout
                }
            ]
        );
    };

    const handleExportNotes = () => {
        setIsExportModalVisible(true);
    };

    const performExport = async (format: 'json' | 'text') => {
        setIsExportModalVisible(false);
        setIsExporting(true);

        try {
            const result = format === 'json'
                ? await exportNotesAsJSON()
                : await exportNotesAsText();

            if (result.success) {
                Alert.alert('Export Successful', result.message);
            } else {
                Alert.alert('Export Failed', result.message);
            }
        } catch (error) {
            Alert.alert('Error', 'An unexpected error occurred during export');
        } finally {
            setIsExporting(false);
        }
    };

    const SettingSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>{title}</Text>
            <View style={[styles.sectionContent, isDarkMode && styles.sectionContentDark]}>
                {children}
            </View>
        </View>
    );

    const SettingRow = ({
        icon,
        label,
        value,
        onPress,
        showArrow = true,
        rightComponent
    }: {
        icon: string;
        label: string;
        value?: string;
        onPress?: () => void;
        showArrow?: boolean;
        rightComponent?: React.ReactNode;
    }) => (
        <TouchableOpacity
            style={styles.settingRow}
            onPress={onPress}
            disabled={!onPress}
            activeOpacity={onPress ? 0.7 : 1}
        >
            <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, isDarkMode && styles.iconContainerDark]}>
                    <Feather name={icon as any} size={20} color={isDarkMode ? "#a5b4fc" : "#6366f1"} />
                </View>
                <View style={styles.settingInfo}>
                    <Text style={[styles.settingLabel, isDarkMode && styles.textDark]}>{label}</Text>
                    {value && (
                        <Text style={[styles.settingValue, isDarkMode && styles.settingValueDark]}>{value}</Text>
                    )}
                </View>
            </View>
            {rightComponent || (showArrow && onPress && (
                <Feather name="chevron-right" size={20} color={isDarkMode ? "#64748b" : "#9CA3AF"} />
            ))}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Profile Section */}
                <SettingSection title="Profile">
                    <View style={styles.profileHeader}>
                        <View style={[styles.avatar, { backgroundColor: '#A5B4FC' }]}>
                            <Text style={styles.avatarText}>
                                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                            </Text>
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={[styles.profileName, isDarkMode && styles.textDark]}>
                                {user?.name || 'User'}
                            </Text>
                            <Text style={[styles.profileEmail, isDarkMode && styles.profileEmailDark]}>
                                {user?.email || 'user@example.com'}
                            </Text>
                        </View>
                    </View>
                </SettingSection>

                {/* Appearance */}
                <SettingSection title="Appearance">
                    <SettingRow
                        icon="moon"
                        label="Dark Mode"
                        value={isDarkMode ? 'On' : 'Off'}
                        showArrow={false}
                        rightComponent={
                            <Switch
                                value={isDarkMode}
                                onValueChange={toggleTheme}
                                trackColor={{ false: '#cbd5e1', true: '#6366f1' }}
                                thumbColor="#ffffff"
                            />
                        }
                    />
                </SettingSection>

                {/* Notifications */}
                <SettingSection title="Notifications">
                    <SettingRow
                        icon="bell"
                        label="Reminder Notifications"
                        value={notificationsEnabled ? 'On' : 'Off'}
                        showArrow={false}
                        rightComponent={
                            <Switch
                                value={notificationsEnabled}
                                onValueChange={setNotificationsEnabled}
                                trackColor={{ false: '#cbd5e1', true: '#6366f1' }}
                                thumbColor="#ffffff"
                            />
                        }
                    />
                    <View style={styles.divider} />
                    <SettingRow
                        icon="refresh-cw"
                        label="Sync Notifications"
                        value={syncNotifications ? 'On' : 'Off'}
                        showArrow={false}
                        rightComponent={
                            <Switch
                                value={syncNotifications}
                                onValueChange={setSyncNotifications}
                                trackColor={{ false: '#cbd5e1', true: '#6366f1' }}
                                thumbColor="#ffffff"
                            />
                        }
                    />
                </SettingSection>

                {/* Data & Storage */}
                <SettingSection title="Data & Storage">
                    <SettingRow
                        icon="trash-2"
                        label="Clear Cache"
                        value="Free up space"
                        onPress={handleClearCache}
                    />
                    <View style={styles.divider} />
                    <SettingRow
                        icon="download"
                        label="Export Notes"
                        value="Download all notes"
                        onPress={handleExportNotes}
                    />
                </SettingSection>

                {/* About */}
                <SettingSection title="About">
                    <SettingRow
                        icon="info"
                        label="App Version"
                        value="1.0.0"
                        showArrow={false}
                    />
                    <View style={styles.divider} />
                    <SettingRow
                        icon="file-text"
                        label="Terms of Service"
                        onPress={() => router.push('/legal/terms')}
                    />
                    <View style={styles.divider} />
                    <SettingRow
                        icon="shield"
                        label="Privacy Policy"
                        onPress={() => router.push('/legal/privacy')}
                    />
                </SettingSection>

                {/* Account */}
                <SettingSection title="Account">
                    <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={handleLogout}
                    >
                        <Feather name="log-out" size={20} color="#EF4444" />
                        <Text style={styles.logoutText}>Logout</Text>
                    </TouchableOpacity>
                </SettingSection>

                <View style={styles.footer}>
                    <Text style={[styles.footerText, isDarkMode && styles.footerTextDark]}>
                        Made with ❤️ by Homa Notes Team
                    </Text>
                </View>
            </ScrollView>

            {/* Export Format Selection Modal */}
            <Modal
                visible={isExportModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsExportModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setIsExportModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={[styles.exportModal, isDarkMode && styles.exportModalDark]}>
                                <View style={styles.exportModalHeader}>
                                    <Text style={[styles.exportModalTitle, isDarkMode && styles.textDark]}>
                                        Export Notes
                                    </Text>
                                    <Text style={[styles.exportModalSubtitle, isDarkMode && styles.textDarkSecondary]}>
                                        Choose export format
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    style={[styles.exportOption, isDarkMode && styles.exportOptionDark]}
                                    onPress={() => performExport('json')}
                                >
                                    <View style={[styles.exportIconContainer, { backgroundColor: isDarkMode ? 'rgba(99, 102, 241, 0.1)' : '#EEF2FF' }]}>
                                        <Feather name="code" size={24} color="#6366f1" />
                                    </View>
                                    <View style={styles.exportOptionText}>
                                        <Text style={[styles.exportOptionTitle, isDarkMode && styles.textDark]}>
                                            JSON Format
                                        </Text>
                                        <Text style={[styles.exportOptionDescription, isDarkMode && styles.textDarkSecondary]}>
                                            Complete data with all metadata
                                        </Text>
                                    </View>
                                    <Feather name="chevron-right" size={20} color={isDarkMode ? '#64748b' : '#9CA3AF'} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.exportOption, isDarkMode && styles.exportOptionDark]}
                                    onPress={() => performExport('text')}
                                >
                                    <View style={[styles.exportIconContainer, { backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.1)' : '#F0FDF4' }]}>
                                        <Feather name="file-text" size={24} color="#22C55E" />
                                    </View>
                                    <View style={styles.exportOptionText}>
                                        <Text style={[styles.exportOptionTitle, isDarkMode && styles.textDark]}>
                                            Plain Text Format
                                        </Text>
                                        <Text style={[styles.exportOptionDescription, isDarkMode && styles.textDarkSecondary]}>
                                            Human-readable text file
                                        </Text>
                                    </View>
                                    <Feather name="chevron-right" size={20} color={isDarkMode ? '#64748b' : '#9CA3AF'} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.exportCancelButton}
                                    onPress={() => setIsExportModalVisible(false)}
                                >
                                    <Text style={styles.exportCancelText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Export Loading Overlay */}
            {isExporting && (
                <View style={styles.loadingOverlay}>
                    <View style={[styles.loadingContainer, isDarkMode && styles.loadingContainerDark]}>
                        <ActivityIndicator size="large" color="#6366f1" />
                        <Text style={[styles.loadingText, isDarkMode && styles.textDark]}>
                            Exporting notes...
                        </Text>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    containerDark: {
        backgroundColor: '#0f172a',
    },
    scrollContent: {
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    sectionTitleDark: {
        color: '#94a3b8',
    },
    sectionContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        overflow: 'hidden',
    },
    sectionContentDark: {
        backgroundColor: '#1e293b',
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#ffffff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    profileInfo: {
        marginLeft: 16,
        flex: 1,
    },
    profileName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    profileEmail: {
        fontSize: 14,
        color: '#6B7280',
    },
    profileEmailDark: {
        color: '#94a3b8',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainerDark: {
        backgroundColor: '#312e81',
    },
    settingInfo: {
        marginLeft: 12,
        flex: 1,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1F2937',
    },
    settingValue: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },
    settingValueDark: {
        color: '#94a3b8',
    },
    textDark: {
        color: '#f8fafc',
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginLeft: 68,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        gap: 8,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#EF4444',
    },
    footer: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    footerText: {
        fontSize: 13,
        color: '#9CA3AF',
    },
    footerTextDark: {
        color: '#64748b',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    exportModal: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
    },
    exportModalDark: {
        backgroundColor: '#1e293b',
    },
    exportModalHeader: {
        marginBottom: 20,
    },
    exportModalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 4,
    },
    exportModalSubtitle: {
        fontSize: 14,
        color: '#6B7280',
    },
    exportOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        marginBottom: 12,
    },
    exportOptionDark: {
        backgroundColor: '#0f172a',
    },
    exportIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    exportOptionText: {
        flex: 1,
    },
    exportOptionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 2,
    },
    exportOptionDescription: {
        fontSize: 13,
        color: '#6B7280',
    },
    exportCancelButton: {
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    exportCancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        minWidth: 200,
    },
    loadingContainerDark: {
        backgroundColor: '#1e293b',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    textDarkSecondary: {
        color: '#94a3b8',
    },
});

import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
    const { user, logout } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();
    const router = useRouter();

    return (
        <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
            <View style={[styles.header, isDarkMode && styles.headerDark]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Feather name="chevron-left" size={28} color={isDarkMode ? "#94a3b8" : "#374151"} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, isDarkMode && styles.textDark]}>Settings</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.profileSection}>
                    <View style={[styles.avatarLarge, isDarkMode && styles.avatarDark]}>
                        <Text style={[styles.avatarTextLarge, isDarkMode && styles.avatarTextDark]}>{user?.name?.charAt(0)}</Text>
                    </View>
                    <Text style={[styles.profileName, isDarkMode && styles.profileNameDark]}>{user?.name}</Text>
                    <Text style={[styles.profileEmail, isDarkMode && styles.profileEmailDark]}>{user?.email}</Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionLabel, isDarkMode && styles.sectionLabelDark]}>Account</Text>
                    <TouchableOpacity
                        style={[styles.menuItem, isDarkMode && styles.menuItemDark]}
                        onPress={() => Alert.alert('Feature coming soon', 'Profile editing will be available in the next update!')}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? 'rgba(99, 102, 241, 0.1)' : '#EEF2FF' }]}>
                            <Feather name="user" size={20} color="#6366f1" />
                        </View>
                        <Text style={[styles.menuItemText, isDarkMode && styles.textDark]}>Edit Profile</Text>
                        <Feather name="chevron-right" size={20} color={isDarkMode ? "#475569" : "#D1D5DB"} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.menuItem, isDarkMode && styles.menuItemDark]}
                        onPress={() => router.push('/settings/labels')}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? '#312E81' : '#E0E7FF' }]}>
                            <Feather name="tag" size={20} color={isDarkMode ? "#A5B4FC" : "#4F46E5"} />
                        </View>
                        <Text style={[styles.menuItemText, isDarkMode && styles.textDark]}>Manage Labels</Text>
                        <Feather name="chevron-right" size={20} color={isDarkMode ? "#6B7280" : "#D1D5DB"} />
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionLabel, isDarkMode && styles.sectionLabelDark]}>App Preferences</Text>
                    <TouchableOpacity
                        style={[styles.menuItem, isDarkMode && styles.menuItemDark]}
                        onPress={() => Alert.alert('Notifications', 'System notification settings are currently managed by Homa.')}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? '#064E3B' : '#F0FDF4' }]}>
                            <Feather name="bell" size={20} color={isDarkMode ? "#34D399" : "#10B981"} />
                        </View>
                        <Text style={[styles.menuItemText, isDarkMode && styles.textDark]}>Notifications</Text>
                        <Feather name="chevron-right" size={20} color={isDarkMode ? "#475569" : "#D1D5DB"} />
                    </TouchableOpacity>
                    <View style={[styles.menuItem, isDarkMode && styles.menuItemDark]}>
                        <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? '#78350F' : '#FFF7ED' }]}>
                            <Feather name="moon" size={20} color={isDarkMode ? "#FBBF24" : "#F59E0B"} />
                        </View>
                        <Text style={[styles.menuItemText, isDarkMode && styles.textDark]}>Dark Mode</Text>
                        <Switch
                            value={isDarkMode}
                            onValueChange={toggleTheme}
                            trackColor={{ false: "#D1D5DB", true: "#4F46E5" }}
                            thumbColor={isDarkMode ? "#A5B4FC" : "#F4F3F4"}
                        />
                    </View>
                </View>

                <TouchableOpacity style={[styles.logoutButton, isDarkMode && styles.logoutButtonDark]} onPress={logout}>
                    <Feather name="log-out" size={20} color="#EF4444" />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                <Text style={[styles.versionText, isDarkMode && { color: '#334155' }]}>Homa v1.0.0</Text>
            </ScrollView>
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
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    textDark: {
        color: '#f8fafc',
    },
    avatarDark: {
        backgroundColor: '#1e293b',
        borderColor: '#818cf8',
    },
    avatarTextDark: {
        color: '#818cf8',
    },
    profileNameDark: {
        color: '#f8fafc',
    },
    profileEmailDark: {
        color: '#94a3b8',
    },
    sectionLabelDark: {
        color: '#475569',
    },
    logoutButtonDark: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    content: {
        padding: 24,
    },
    profileSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    avatarLarge: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: '#6366f1',
        marginBottom: 16,
    },
    avatarTextLarge: {
        fontSize: 40,
        fontWeight: 'bold',
        color: '#6366f1',
    },
    profileName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    profileEmail: {
        fontSize: 16,
        color: '#6B7280',
        marginTop: 4,
    },
    section: {
        marginBottom: 24,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
        marginLeft: 4,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        marginBottom: 8,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    menuItemText: {
        flex: 1,
        fontSize: 16,
        color: '#374151',
        fontWeight: '500',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        backgroundColor: '#FEE2E2',
        marginTop: 16,
    },
    logoutText: {
        marginLeft: 12,
        fontSize: 16,
        fontWeight: 'bold',
        color: '#EF4444',
    },
    menuItemDark: {
        backgroundColor: '#1e293b',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    versionText: {
        textAlign: 'center',
        color: '#D1D5DB',
        fontSize: 12,
        marginTop: 40,
        marginBottom: 20,
    }
});

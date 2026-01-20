import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Drawer } from 'expo-router/drawer';
import { useTheme } from '../../context/ThemeContext';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

function CustomDrawerContent(props: any) {
    const { isDarkMode } = useTheme();
    const router = useRouter();
    const pathname = usePathname();
    const { user, logout } = useAuth(); // Assuming useAuth provides user info

    // Helper to determine if a route is active (simple version)
    const isActive = (route: string) => pathname === route;

    return (
        <View style={{ flex: 1, backgroundColor: isDarkMode ? '#0f172a' : '#FFFFFF' }}>
            <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
                {/* Header */}
                <View style={[styles.drawerHeader, isDarkMode && styles.drawerHeaderDark]}>
                    <Text style={[styles.appName, isDarkMode && styles.textDark]}>
                        <Text style={{ color: '#6366f1' }}>Note</Text>App
                    </Text>
                </View>

                {/* Main Items */}
                <View style={styles.section}>
                    <DrawerItem
                        label="Notes"
                        icon={({ color, size }) => <Feather name="file-text" size={size} color={color} />}
                        focused={isActive('/(drawer)')}
                        onPress={() => router.push('/(drawer)')}
                        activeTintColor="#6366f1"
                        inactiveTintColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                        activeBackgroundColor={isDarkMode ? 'rgba(99, 102, 241, 0.1)' : '#EEF2FF'}
                        labelStyle={{ marginLeft: -16, fontWeight: '600' }}
                    />
                    <DrawerItem
                        label="Reminders"
                        icon={({ color, size }) => <Feather name="bell" size={size} color={color} />}
                        onPress={() => { }} // Todo: Implement Reminder Filter
                        inactiveTintColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                        labelStyle={{ marginLeft: -16, fontWeight: '600' }}
                    />
                </View>

                <View style={[styles.divider, isDarkMode && styles.dividerDark]} />

                {/* Labels Section (Placeholder for now) */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>LABELS</Text>
                    <DrawerItem
                        label="Create new label"
                        icon={({ color, size }) => <Feather name="plus" size={size} color={color} />}
                        onPress={() => { }} // Todo
                        inactiveTintColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                        labelStyle={{ marginLeft: -16, fontWeight: '600' }}
                    />
                </View>

                <View style={[styles.divider, isDarkMode && styles.dividerDark]} />

                {/* Archive & Trash */}
                <View style={styles.section}>
                    <DrawerItem
                        label="Archive"
                        icon={({ color, size }) => <Feather name="archive" size={size} color={color} />}
                        onPress={() => { }} // Todo
                        inactiveTintColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                        labelStyle={{ marginLeft: -16, fontWeight: '600' }}
                    />
                    <DrawerItem
                        label="Trash"
                        icon={({ color, size }) => <Feather name="trash-2" size={size} color={color} />}
                        onPress={() => { }} // Todo
                        inactiveTintColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                        labelStyle={{ marginLeft: -16, fontWeight: '600' }}
                    />
                </View>

                <View style={[styles.divider, isDarkMode && styles.dividerDark]} />

                {/* Settings */}
                <View style={styles.section}>
                    <DrawerItem
                        label="Settings"
                        icon={({ color, size }) => <Feather name="settings" size={size} color={color} />}
                        onPress={() => { }}
                        inactiveTintColor={isDarkMode ? '#9CA3AF' : '#4B5563'}
                        labelStyle={{ marginLeft: -16, fontWeight: '600' }}
                    />
                </View>
            </DrawerContentScrollView>

            {/* Footer */}
            <View style={[styles.drawerFooter, isDarkMode && styles.drawerFooterDark]}>
                <TouchableOpacity onPress={logout} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Feather name="log-out" size={20} color={isDarkMode ? "#9CA3AF" : "#4B5563"} />
                    <Text style={[styles.footerText, isDarkMode && styles.textDark]}>Sign out</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

export default function DrawerLayout() {
    const { isDarkMode } = useTheme();

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <Drawer
                drawerContent={(props) => <CustomDrawerContent {...props} />}
                screenOptions={{
                    headerShown: false,
                    drawerType: 'front',
                    drawerStyle: {
                        backgroundColor: isDarkMode ? '#0f172a' : '#FFFFFF',
                        width: '80%',
                    },
                    overlayColor: 'rgba(0,0,0,0.5)',
                }}
            >
                <Drawer.Screen
                    name="index"
                    options={{
                        drawerLabel: 'Notes',
                        title: 'Notes',
                    }}
                />
            </Drawer>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    drawerHeader: {
        padding: 24,
        paddingTop: 48,
        paddingBottom: 20,
    },
    drawerHeaderDark: {
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    appName: {
        fontSize: 24,
        fontWeight: '900',
        color: '#111827',
        letterSpacing: -0.5,
    },
    textDark: {
        color: '#f8fafc',
    },
    section: {
        paddingVertical: 8,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#9CA3AF',
        marginLeft: 18,
        marginBottom: 4,
        marginTop: 8,
    },
    sectionTitleDark: {
        color: '#64748b',
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: 4,
    },
    dividerDark: {
        backgroundColor: '#1e293b',
    },
    drawerFooter: {
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    drawerFooterDark: {
        borderTopColor: '#1e293b',
    },
    footerText: {
        marginLeft: 12,
        fontSize: 14,
        fontWeight: '600',
        color: '#4B5563',
    }
});

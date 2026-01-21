import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Drawer } from 'expo-router/drawer';
import { useTheme } from '../../context/ThemeContext';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

import CustomDrawerContent from '../../components/CustomDrawerContent';

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

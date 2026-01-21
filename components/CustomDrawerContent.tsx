import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useLabels } from '../context/LabelContext';

export default function CustomDrawerContent(props: any) {
    const { isDarkMode } = useTheme();
    const router = useRouter();
    const pathname = usePathname();
    const { labels } = useLabels();

    const menuItems = [
        { label: 'Notes', icon: 'lightbulb-outline', route: '/(drawer)', type: 'material' },
        { label: 'Reminders', icon: 'bell', route: '/reminders', type: 'feather' },
    ];

    const lowerItems = [
        { label: 'Archive', icon: 'archive', route: '/archive', type: 'feather' },
        { label: 'Trash', icon: 'trash-2', route: '/trash', type: 'feather' },
        { label: 'Settings', icon: 'settings', route: '/settings', type: 'feather' }, // Assuming settings is in tabs or separate route
    ];

    return (
        <View style={[styles.container, isDarkMode && styles.containerDark]}>
            <View style={styles.header}>
                <Text style={[styles.appName, isDarkMode && styles.textDark]}>Google Keep Clone</Text>
            </View>

            <DrawerContentScrollView {...props} contentContainerStyle={styles.scrollContent}>
                {menuItems.map((item, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[
                            styles.drawerItem,
                            pathname === item.route && styles.activeItem,
                            pathname === item.route && (isDarkMode ? styles.activeItemDark : styles.activeItemLight),
                        ]}
                        onPress={() => router.push(item.route as any)}
                    >
                        {item.type === 'material' ? (
                            <MaterialIcons
                                name={item.icon as any}
                                size={24}
                                color={pathname === item.route ? (isDarkMode ? '#818cf8' : '#6366f1') : (isDarkMode ? '#94a3b8' : '#5f6368')}
                            />
                        ) : (
                            <Feather
                                name={item.icon as any}
                                size={24}
                                color={pathname === item.route ? (isDarkMode ? '#818cf8' : '#6366f1') : (isDarkMode ? '#94a3b8' : '#5f6368')}
                            />
                        )}
                        <Text style={[
                            styles.itemLabel,
                            isDarkMode && styles.textDark,
                            pathname === item.route && (isDarkMode ? styles.activeTextDark : styles.activeTextLight)
                        ]}>
                            {item.label}
                        </Text>
                    </TouchableOpacity>
                ))}

                <View style={[styles.divider, isDarkMode && styles.dividerDark]} />

                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>LABELS</Text>
                    <TouchableOpacity style={styles.editBtn}>
                        <Text style={[styles.editBtnText, isDarkMode && styles.textDarkSecondary]}>Edit</Text>
                    </TouchableOpacity>
                </View>

                {labels.map((label: any) => (
                    <TouchableOpacity
                        key={label.id}
                        style={styles.drawerItem}
                        onPress={() => {
                            // Close drawer and filter by label (handled in index via params or context ideally)
                            // For now, just close or navigate
                            props.navigation.closeDrawer();
                            // In a real app we might navigate to a dynamic route like /(drawer)/label/[id]
                        }}
                    >
                        <MaterialIcons name="label-outline" size={24} color={isDarkMode ? '#94a3b8' : '#5f6368'} />
                        <Text style={[styles.itemLabel, isDarkMode && styles.textDark]}>{label.name}</Text>
                    </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.drawerItem} onPress={() => {/* Create new label logic */ }}>
                    <Feather name="plus" size={24} color={isDarkMode ? '#94a3b8' : '#5f6368'} />
                    <Text style={[styles.itemLabel, isDarkMode && styles.textDark]}>Create new label</Text>
                </TouchableOpacity>

                <View style={[styles.divider, isDarkMode && styles.dividerDark]} />

                {lowerItems.map((item, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[
                            styles.drawerItem,
                            pathname === item.route && styles.activeItem,
                            pathname === item.route && (isDarkMode ? styles.activeItemDark : styles.activeItemLight),
                        ]}
                        onPress={() => router.push(item.route as any)}
                    >
                        <Feather
                            name={item.icon as any}
                            size={24}
                            color={pathname === item.route ? (isDarkMode ? '#818cf8' : '#6366f1') : (isDarkMode ? '#94a3b8' : '#5f6368')}
                        />
                        <Text style={[
                            styles.itemLabel,
                            isDarkMode && styles.textDark,
                            pathname === item.route && (isDarkMode ? styles.activeTextDark : styles.activeTextLight)
                        ]}>
                            {item.label}
                        </Text>
                    </TouchableOpacity>
                ))}

            </DrawerContentScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    containerDark: {
        backgroundColor: '#1e293b',
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 20,
    },
    appName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#5f6368',
    },
    scrollContent: {
        paddingTop: 0,
    },
    drawerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginRight: 8,
        borderTopRightRadius: 24,
        borderBottomRightRadius: 24,
    },
    activeItem: {
        // Base active style
    },
    activeItemLight: {
        backgroundColor: '#eef2ff',
    },
    activeItemDark: {
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
    },
    itemLabel: {
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 16,
        color: '#3c4043',
    },
    activeTextLight: {
        color: '#6366f1',
    },
    activeTextDark: {
        color: '#818cf8',
    },
    textDark: {
        color: '#e2e8f0',
    },
    textDarkSecondary: {
        color: '#94a3b8',
    },
    divider: {
        height: 1,
        backgroundColor: '#e0e0e0',
        marginVertical: 8,
    },
    dividerDark: {
        backgroundColor: '#334155',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '500',
        color: '#5f6368',
        letterSpacing: 0.5,
    },
    editBtn: {
        padding: 4,
    },
    editBtnText: {
        fontSize: 12,
        color: '#5f6368',
    },
});

import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Text, Modal, TouchableWithoutFeedback } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';

export default function CreationFab() {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();
    const { isDarkMode } = useTheme();

    const handlePress = (type: string) => {
        setIsOpen(false);
        router.push({ pathname: '/notes/create', params: { type } });
    };

    const toggleMenu = () => {
        setIsOpen(!isOpen);
    };

    return (
        <>
            {isOpen && (
                <Modal transparent animationType="fade" visible={isOpen} onRequestClose={() => setIsOpen(false)}>
                    <TouchableWithoutFeedback onPress={() => setIsOpen(false)}>
                        <View style={styles.overlay}>
                            <View style={[styles.menuContainer, isDarkMode && styles.menuContainerDark]}>
                                <TouchableOpacity style={styles.menuItem} onPress={() => handlePress('text')}>
                                    <Text style={[styles.menuLabel, isDarkMode && styles.textDark]}>Text</Text>
                                    <View style={[styles.iconButton, { backgroundColor: '#F3F4F6' }]}>
                                        <Feather name="type" size={24} color="#4B5563" />
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.menuItem} onPress={() => handlePress('list')}>
                                    <Text style={[styles.menuLabel, isDarkMode && styles.textDark]}>List</Text>
                                    <View style={[styles.iconButton, { backgroundColor: '#EEF2FF' }]}>
                                        <Feather name="check-square" size={24} color="#6366f1" />
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.menuItem} onPress={() => handlePress('drawing')}>
                                    <Text style={[styles.menuLabel, isDarkMode && styles.textDark]}>Drawing</Text>
                                    <View style={[styles.iconButton, { backgroundColor: '#F0FDF4' }]}>
                                        <Feather name="pen-tool" size={24} color="#22C55E" />
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.menuItem} onPress={() => handlePress('image')}>
                                    <Text style={[styles.menuLabel, isDarkMode && styles.textDark]}>Image</Text>
                                    <View style={[styles.iconButton, { backgroundColor: '#FEF2F2' }]}>
                                        <Feather name="image" size={24} color="#EF4444" />
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.menuItem} onPress={() => handlePress('audio')}>
                                    <Text style={[styles.menuLabel, isDarkMode && styles.textDark]}>Audio</Text>
                                    <View style={[styles.iconButton, { backgroundColor: '#FFF7ED' }]}>
                                        <Feather name="mic" size={24} color="#F97316" />
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>
            )}

            <TouchableOpacity
                style={[styles.fab, isDarkMode && styles.fabDark]}
                onPress={toggleMenu}
                activeOpacity={0.8}
            >
                <Feather name={isOpen ? "x" : "plus"} size={32} color="white" />
            </TouchableOpacity>
        </>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
    },
    menuContainer: {
        marginBottom: 100,
        marginRight: 24,
        alignItems: 'flex-end',
    },
    menuContainerDark: {
        // bg
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    menuLabel: {
        marginRight: 16,
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    textDark: {
        color: '#f8fafc',
    },
    iconButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    fab: {
        position: 'absolute',
        right: 24,
        bottom: 24,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#6366f1',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.30,
        shadowRadius: 4.65,
        elevation: 8,
        zIndex: 100,
    },
    fabDark: {
        backgroundColor: '#6366f1',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    }
});

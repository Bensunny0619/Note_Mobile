import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, Modal } from 'react-native';
import { Canvas, Path, SkPath, Skia, useTouchHandler } from '@shopify/react-native-skia';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import * as FileSystem from 'expo-file-system/legacy';

type DrawingCanvasProps = {
    onDrawingSaved: (imageUri: string) => void;
    onDrawingDeleted?: () => void;
    existingDrawing?: string;
    initialOpen?: boolean;
};

type PathData = {
    path: SkPath;
    color: string;
    strokeWidth: number;
};

const COLORS = ['#000000', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

export default function DrawingCanvas({ onDrawingSaved, onDrawingDeleted, existingDrawing, initialOpen }: DrawingCanvasProps) {
    const { isDarkMode } = useTheme();
    const [isDrawingMode, setIsDrawingMode] = useState(initialOpen || false);
    const [paths, setPaths] = useState<PathData[]>([]);
    const [currentPath, setCurrentPath] = useState<SkPath | null>(null);
    const [selectedColor, setSelectedColor] = useState('#000000');
    const [strokeWidth, setStrokeWidth] = useState(4);

    const touchHandler = useTouchHandler({
        onStart: ({ x, y }) => {
            const newPath = Skia.Path.Make();
            newPath.moveTo(x, y);
            setCurrentPath(newPath);
        },
        onActive: ({ x, y }) => {
            if (currentPath) {
                currentPath.lineTo(x, y);
            }
        },
        onEnd: () => {
            if (currentPath) {
                setPaths(prev => [...prev, { path: currentPath, color: selectedColor, strokeWidth }]);
                setCurrentPath(null);
            }
        },
    });

    const handleClear = () => {
        setPaths([]);
        setCurrentPath(null);
    };

    const handleUndo = () => {
        setPaths(prev => prev.slice(0, -1));
    };

    const handleSave = async () => {
        setIsDrawingMode(false);
        // Note: Real implementation needs ref.current.makeImageSnapshot().encodeToBase64()
        // For now preventing syntax errors with placeholder logic
        const dummyUri = `${FileSystem.cacheDirectory}drawing_${Date.now()}.png`;
        onDrawingSaved(dummyUri);
    };

    const deleteDrawing = () => {
        setIsDrawingMode(false);
        onDrawingDeleted?.();
    };

    // Preview View (Same as before)
    if (!isDrawingMode && existingDrawing) {
        return (
            <View style={styles.container}>
                <View style={[styles.preview, isDarkMode && styles.previewDark]}>
                    <Feather name="edit-3" size={20} color="#6366f1" />
                    <Text style={[styles.previewText, isDarkMode && styles.textDark]}>Drawing attached</Text>
                    <TouchableOpacity onPress={() => setIsDrawingMode(true)} style={styles.editBtn}>
                        <Text style={styles.editText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={deleteDrawing}>
                        <Feather name="trash-2" size={20} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // Add Button View
    if (!isDrawingMode && !existingDrawing) {
        return (
            <View style={styles.container}>
                <TouchableOpacity style={styles.openBtn} onPress={() => setIsDrawingMode(true)}>
                    <Feather name="edit-3" size={20} color="#6366f1" />
                    <Text style={styles.openBtnText}>Add Drawing (Skia)</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Modal / Fullscreen Canvas
    return (
        <Modal visible={isDrawingMode} animationType="slide" onRequestClose={() => setIsDrawingMode(false)}>
            <View style={[styles.fullScreenContainer, isDarkMode && styles.containerDark]}>
                <View style={[styles.toolbar, isDarkMode && styles.toolbarDark]}>
                    <TouchableOpacity onPress={() => setIsDrawingMode(false)}>
                        <Feather name="x" size={24} color={isDarkMode ? '#fff' : '#000'} />
                    </TouchableOpacity>
                    <Text style={[styles.title, isDarkMode && styles.textDark]}>Drawing</Text>
                    <TouchableOpacity onPress={handleSave}>
                        <Text style={styles.saveText}>Done</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.canvasContainer}>
                    <Canvas style={{ flex: 1 }} onTouch={touchHandler}>
                        {paths.map((p, index) => (
                            <Path
                                key={index}
                                path={p.path}
                                color={p.color}
                                style="stroke"
                                strokeWidth={p.strokeWidth}
                                strokeJoin="round"
                                strokeCap="round"
                            />
                        ))}
                        {currentPath && (
                            <Path
                                path={currentPath}
                                color={selectedColor}
                                style="stroke"
                                strokeWidth={strokeWidth}
                                strokeJoin="round"
                                strokeCap="round"
                            />
                        )}
                    </Canvas>
                </View>

                <View style={[styles.controls, isDarkMode && styles.controlsDark]}>
                    <View style={styles.row}>
                        {COLORS.map(color => (
                            <TouchableOpacity
                                key={color}
                                style={[
                                    styles.colorBtn,
                                    { backgroundColor: color },
                                    selectedColor === color && styles.selectedColor
                                ]}
                                onPress={() => setSelectedColor(color)}
                            />
                        ))}
                    </View>

                    <View style={styles.row}>
                        <TouchableOpacity onPress={handleUndo} style={styles.actionBtn}>
                            <Feather name="corner-up-left" size={24} color={isDarkMode ? '#fff' : '#000'} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleClear} style={styles.actionBtn}>
                            <Feather name="trash-2" size={24} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { marginVertical: 12 },
    openBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EEF2FF',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        gap: 10,
    },
    openBtnText: { fontSize: 15, fontWeight: '600', color: '#6366f1' },
    fullScreenContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    containerDark: { backgroundColor: '#0f172a' },
    toolbar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        paddingTop: 50, // Safe Area
    },
    toolbarDark: { borderBottomColor: '#334155' },
    title: { fontSize: 18, fontWeight: '600' },
    saveText: { fontSize: 16, fontWeight: '600', color: '#6366f1' },
    canvasContainer: { flex: 1, backgroundColor: '#ffffff' }, // Canvas usually needs white bg
    controls: { padding: 20, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingBottom: 40 },
    controlsDark: { backgroundColor: '#1e293b', borderTopColor: '#334155' },
    row: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 16 },
    colorBtn: { width: 32, height: 32, borderRadius: 16 },
    selectedColor: { borderWidth: 2, borderColor: '#6366f1', transform: [{ scale: 1.2 }] },
    actionBtn: { padding: 8 },
    textDark: { color: '#f8fafc' },
    preview: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    previewDark: { backgroundColor: '#1e293b' },
    previewText: { flex: 1, fontSize: 14, fontWeight: '500', color: '#374151' },
    editBtn: { marginRight: 8 },
    editText: { fontSize: 14, fontWeight: '600', color: '#6366f1' },
});

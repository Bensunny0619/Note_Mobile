import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Modal } from 'react-native';
import { Canvas, Path, SkPath, Skia } from '@shopify/react-native-skia';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import * as FileSystem from 'expo-file-system/legacy';
import { PanGestureHandler, GestureHandlerRootView, State } from 'react-native-gesture-handler';

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

export interface DrawingCanvasRef {
    open: () => void;
}

const COLORS = ['#000000', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(({ onDrawingSaved, onDrawingDeleted, existingDrawing, initialOpen }, ref) => {
    const { isDarkMode } = useTheme();
    const [isDrawingMode, setIsDrawingMode] = useState(initialOpen || false);
    const [paths, setPaths] = useState<PathData[]>([]);
    const [currentPath, setCurrentPath] = useState<SkPath | null>(null);
    const [selectedColor, setSelectedColor] = useState('#000000');
    const [strokeWidth, setStrokeWidth] = useState(4);

    useImperativeHandle(ref, () => ({
        open: () => setIsDrawingMode(true)
    }));

    useEffect(() => {
        if (initialOpen) setIsDrawingMode(true);
    }, [initialOpen]);

    const onGestureEvent = (event: any) => {
        const { x, y } = event.nativeEvent;
        if (!currentPath) {
            const newPath = Skia.Path.Make();
            newPath.moveTo(x, y);
            setCurrentPath(newPath);
        } else {
            currentPath.lineTo(x, y);
            // Force re-render if needed, but Skia often handles mutation. 
            // React state update is better for re-render.
            // setCurrentPath(currentPath.copy()); // Expensive?
            // Actually, typically we just need to trigger a render.
            setCurrentPath(prev => prev);
        }
    };

    const onHandlerStateChange = (event: any) => {
        if (event.nativeEvent.state === State.BEGAN) {
            const { x, y } = event.nativeEvent;
            const newPath = Skia.Path.Make();
            newPath.moveTo(x, y);
            setCurrentPath(newPath);
        } else if (event.nativeEvent.state === State.END || event.nativeEvent.state === State.CANCELLED) {
            if (currentPath) {
                setPaths(prev => [...prev, { path: currentPath, color: selectedColor, strokeWidth }]);
                setCurrentPath(null);
            }
        }
    };

    const handleClear = () => {
        setPaths([]);
        setCurrentPath(null);
    };

    const handleUndo = () => {
        setPaths(prev => prev.slice(0, -1));
    };

    const handleSave = async () => {
        setIsDrawingMode(false);
        const dummyUri = `${FileSystem.cacheDirectory}drawing_${Date.now()}.png`;
        onDrawingSaved(dummyUri);
    };

    const deleteDrawing = () => {
        setIsDrawingMode(false);
        onDrawingDeleted?.();
    };

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

    if (!isDrawingMode && !existingDrawing) {
        // We hide the button if the parent is expected to trigger it, 
        // BUT for manual addition we still need it if not triggered by toolbar.
        // The toolbar handles 'add' -> sets initialOpen logic? No, toolbar needs to set a parent state.
        // For now, keep this button as a fallback or hide it? 
        // User asked for Toolbar. 
        // If we want hidden, return null. But CreateNote renders this component in the scrollview.
        // It's better to show it in the scrollview as a "Drawing Area" placeholder if desired?
        // Or keep it as "Add Drawing" inline button.
        return (
            <View style={styles.container}>
                <TouchableOpacity style={styles.openBtn} onPress={() => setIsDrawingMode(true)}>
                    <Feather name="edit-3" size={20} color="#6366f1" />
                    <Text style={styles.openBtnText}>Add Drawing (Skia)</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <Modal visible={isDrawingMode} animationType="slide" onRequestClose={() => setIsDrawingMode(false)}>
            <GestureHandlerRootView style={{ flex: 1 }}>
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
                        <PanGestureHandler
                            onGestureEvent={onGestureEvent}
                            onHandlerStateChange={onHandlerStateChange}
                            minDist={1}
                        >
                            <View style={{ flex: 1 }}>
                                <Canvas style={{ flex: 1 }}>
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
                        </PanGestureHandler>
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
            </GestureHandlerRootView>
        </Modal>
    );
});

export default DrawingCanvas;

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
    canvasContainer: { flex: 1, backgroundColor: '#ffffff' },
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

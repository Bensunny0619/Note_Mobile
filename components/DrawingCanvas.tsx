import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Modal, ScrollView } from 'react-native';
import { Canvas, Path, SkPath, Skia, useCanvasRef } from '@shopify/react-native-skia';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { File, Paths } from 'expo-file-system';
import { PanGestureHandler, GestureHandlerRootView, State } from 'react-native-gesture-handler';
import Slider from '@react-native-community/slider';

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
    opacity: number;
};

type BrushType = 'pen' | 'marker' | 'highlighter' | 'pencil' | 'eraser';

export interface DrawingCanvasRef {
    open: () => void;
}

const COLORS = [
    '#000000', '#FFFFFF', '#EF4444', '#F59E0B', '#10B981',
    '#3B82F6', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'
];

const BRUSH_CONFIGS = {
    pen: { defaultSize: 4, defaultOpacity: 1.0, icon: 'edit-3' },
    marker: { defaultSize: 12, defaultOpacity: 0.8, icon: 'edit-2' },
    highlighter: { defaultSize: 24, defaultOpacity: 0.3, icon: 'minus' },
    pencil: { defaultSize: 3, defaultOpacity: 0.7, icon: 'edit' },
    eraser: { defaultSize: 20, defaultOpacity: 1.0, icon: 'delete' }
};

const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(({ onDrawingSaved, onDrawingDeleted, existingDrawing, initialOpen }, ref) => {
    const { isDarkMode } = useTheme();
    const [isDrawingMode, setIsDrawingMode] = useState(initialOpen || false);
    const canvasRef = useCanvasRef();
    const [paths, setPaths] = useState<PathData[]>([]);
    const [currentPath, setCurrentPath] = useState<SkPath | null>(null);
    const [selectedColor, setSelectedColor] = useState('#000000');
    const [brushType, setBrushType] = useState<BrushType>('pen');
    const [brushSize, setBrushSize] = useState(4);
    const [brushOpacity, setBrushOpacity] = useState(1.0);

    // For smooth drawing
    const lastPoint = useRef<{ x: number; y: number } | null>(null);

    useImperativeHandle(ref, () => ({
        open: () => setIsDrawingMode(true)
    }));

    useEffect(() => {
        if (initialOpen) setIsDrawingMode(true);
    }, [initialOpen]);

    // Update brush settings when brush type changes
    useEffect(() => {
        const config = BRUSH_CONFIGS[brushType];
        setBrushSize(config.defaultSize);
        setBrushOpacity(config.defaultOpacity);
    }, [brushType]);

    const onGestureEvent = (event: any) => {
        const { x, y } = event.nativeEvent;

        if (!currentPath) {
            const newPath = Skia.Path.Make();
            newPath.moveTo(x, y);
            setCurrentPath(newPath);
            lastPoint.current = { x, y };
        } else {
            // Use quadratic curves for smooth drawing
            if (lastPoint.current) {
                const midX = (lastPoint.current.x + x) / 2;
                const midY = (lastPoint.current.y + y) / 2;
                currentPath.quadTo(lastPoint.current.x, lastPoint.current.y, midX, midY);
                lastPoint.current = { x, y };
            } else {
                currentPath.lineTo(x, y);
                lastPoint.current = { x, y };
            }
            // Force re-render
            setCurrentPath(Skia.Path.MakeFromSVGString(currentPath.toSVGString())!);
        }
    };

    const onHandlerStateChange = (event: any) => {
        if (event.nativeEvent.state === State.BEGAN) {
            const { x, y } = event.nativeEvent;
            const newPath = Skia.Path.Make();
            newPath.moveTo(x, y);
            setCurrentPath(newPath);
            lastPoint.current = { x, y };
        } else if (event.nativeEvent.state === State.END || event.nativeEvent.state === State.CANCELLED) {
            if (currentPath) {
                const finalColor = brushType === 'eraser' ? '#FFFFFF' : selectedColor;
                setPaths(prev => [...prev, {
                    path: currentPath,
                    color: finalColor,
                    strokeWidth: brushSize,
                    opacity: brushOpacity
                }]);
                setCurrentPath(null);
                lastPoint.current = null;
            }
        }
    };

    const handleClear = () => {
        setPaths([]);
        setCurrentPath(null);
        lastPoint.current = null;
    };

    const handleUndo = () => {
        setPaths(prev => prev.slice(0, -1));
    };

    const handleSave = async () => {
        try {
            if (!canvasRef.current) {
                console.error('Canvas ref not available');
                return;
            }

            // Use Skia's makeImageSnapshot to capture the canvas
            const snapshot = canvasRef.current.makeImageSnapshot();

            if (!snapshot) {
                console.error('Failed to create snapshot');
                return;
            }

            // Encode to PNG base64
            const base64 = snapshot.encodeToBase64();

            // Create file
            const timestamp = Date.now();
            const filename = `drawing_${timestamp}.png`;
            const file = new File(Paths.cache, filename);

            // Decode base64 and write to file
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            await file.write(bytes);

            console.log('✅ Drawing saved:', file.uri);
            setIsDrawingMode(false);
            onDrawingSaved(file.uri);
        } catch (error) {
            console.error('❌ Failed to save drawing:', error);
            // Fallback
            setIsDrawingMode(false);
        }
    };

    const deleteDrawing = () => {
        setIsDrawingMode(false);
        onDrawingDeleted?.();
    };

    const getCurrentBrushColor = () => {
        return brushType === 'eraser' ? '#FFFFFF' : selectedColor;
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
        return (
            <View style={styles.container}>
                <TouchableOpacity style={styles.openBtn} onPress={() => setIsDrawingMode(true)}>
                    <Feather name="edit-3" size={20} color="#6366f1" />
                    <Text style={styles.openBtnText}>Add Drawing</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <Modal visible={isDrawingMode} animationType="slide" onRequestClose={() => setIsDrawingMode(false)}>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <View style={[styles.fullScreenContainer, isDarkMode && styles.containerDark]}>
                    {/* Toolbar */}
                    <View style={[styles.toolbar, isDarkMode && styles.toolbarDark]}>
                        <TouchableOpacity onPress={() => setIsDrawingMode(false)}>
                            <Feather name="x" size={24} color={isDarkMode ? '#fff' : '#000'} />
                        </TouchableOpacity>
                        <Text style={[styles.title, isDarkMode && styles.textDark]}>Drawing</Text>
                        <TouchableOpacity onPress={handleSave}>
                            <Text style={styles.saveText}>Done</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Canvas */}
                    <View style={styles.canvasContainer}>
                        <PanGestureHandler
                            onGestureEvent={onGestureEvent}
                            onHandlerStateChange={onHandlerStateChange}
                            minDist={0}
                        >
                            <View style={{ flex: 1 }}>
                                <Canvas style={{ flex: 1 }} ref={canvasRef}>
                                    {paths.map((p, index) => (
                                        <Path
                                            key={index}
                                            path={p.path}
                                            color={p.color}
                                            style="stroke"
                                            strokeWidth={p.strokeWidth}
                                            strokeJoin="round"
                                            strokeCap="round"
                                            opacity={p.opacity}
                                        />
                                    ))}
                                    {currentPath && (
                                        <Path
                                            path={currentPath}
                                            color={getCurrentBrushColor()}
                                            style="stroke"
                                            strokeWidth={brushSize}
                                            strokeJoin="round"
                                            strokeCap="round"
                                            opacity={brushOpacity}
                                        />
                                    )}
                                </Canvas>
                            </View>
                        </PanGestureHandler>
                    </View>

                    {/* Controls */}
                    <ScrollView style={[styles.controls, isDarkMode && styles.controlsDark]}>
                        {/* Brush Type Selector */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionLabel, isDarkMode && styles.textDark]}>Brush Type</Text>
                            <View style={styles.brushTypeRow}>
                                {(Object.keys(BRUSH_CONFIGS) as BrushType[]).map(type => (
                                    <TouchableOpacity
                                        key={type}
                                        style={[
                                            styles.brushTypeBtn,
                                            brushType === type && styles.brushTypeBtnActive,
                                            isDarkMode && styles.brushTypeBtnDark,
                                            brushType === type && isDarkMode && styles.brushTypeBtnActiveDark
                                        ]}
                                        onPress={() => setBrushType(type)}
                                    >
                                        <Feather
                                            name={BRUSH_CONFIGS[type].icon as any}
                                            size={20}
                                            color={brushType === type ? '#6366f1' : (isDarkMode ? '#94a3b8' : '#6B7280')}
                                        />
                                        <Text style={[
                                            styles.brushTypeText,
                                            brushType === type && styles.brushTypeTextActive,
                                            isDarkMode && styles.textDark
                                        ]}>
                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Brush Size */}
                        {brushType !== 'eraser' && (
                            <View style={styles.section}>
                                <View style={styles.sliderHeader}>
                                    <Text style={[styles.sectionLabel, isDarkMode && styles.textDark]}>Size</Text>
                                    <View style={[styles.brushPreview, {
                                        width: brushSize * 2,
                                        height: brushSize * 2,
                                        backgroundColor: selectedColor,
                                        opacity: brushOpacity
                                    }]} />
                                </View>
                                <Slider
                                    style={styles.slider}
                                    minimumValue={2}
                                    maximumValue={50}
                                    value={brushSize}
                                    onValueChange={setBrushSize}
                                    minimumTrackTintColor="#6366f1"
                                    maximumTrackTintColor={isDarkMode ? '#334155' : '#E5E7EB'}
                                    thumbTintColor="#6366f1"
                                />
                                <Text style={[styles.sliderValue, isDarkMode && styles.textDark]}>{Math.round(brushSize)}px</Text>
                            </View>
                        )}

                        {/* Opacity */}
                        {brushType !== 'eraser' && (
                            <View style={styles.section}>
                                <Text style={[styles.sectionLabel, isDarkMode && styles.textDark]}>Opacity</Text>
                                <Slider
                                    style={styles.slider}
                                    minimumValue={0.1}
                                    maximumValue={1.0}
                                    value={brushOpacity}
                                    onValueChange={setBrushOpacity}
                                    minimumTrackTintColor="#6366f1"
                                    maximumTrackTintColor={isDarkMode ? '#334155' : '#E5E7EB'}
                                    thumbTintColor="#6366f1"
                                />
                                <Text style={[styles.sliderValue, isDarkMode && styles.textDark]}>{Math.round(brushOpacity * 100)}%</Text>
                            </View>
                        )}

                        {/* Color Palette */}
                        {brushType !== 'eraser' && (
                            <View style={styles.section}>
                                <Text style={[styles.sectionLabel, isDarkMode && styles.textDark]}>Color</Text>
                                <View style={styles.colorRow}>
                                    {COLORS.map(color => (
                                        <TouchableOpacity
                                            key={color}
                                            style={[
                                                styles.colorBtn,
                                                { backgroundColor: color },
                                                selectedColor === color && styles.selectedColor,
                                                color === '#FFFFFF' && styles.whiteColorBorder
                                            ]}
                                            onPress={() => setSelectedColor(color)}
                                        />
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Actions */}
                        <View style={styles.actionsRow}>
                            <TouchableOpacity onPress={handleUndo} style={[styles.actionBtn, isDarkMode && styles.actionBtnDark]}>
                                <Feather name="corner-up-left" size={20} color={isDarkMode ? '#fff' : '#000'} />
                                <Text style={[styles.actionBtnText, isDarkMode && styles.textDark]}>Undo</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleClear} style={[styles.actionBtn, styles.actionBtnDanger]}>
                                <Feather name="trash-2" size={20} color="#EF4444" />
                                <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Clear</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
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
        paddingTop: 50,
    },
    toolbarDark: { borderBottomColor: '#334155' },
    title: { fontSize: 18, fontWeight: '600' },
    saveText: { fontSize: 16, fontWeight: '600', color: '#6366f1' },
    canvasContainer: { flex: 1, backgroundColor: '#ffffff' },
    controls: {
        maxHeight: 400,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        paddingBottom: 20
    },
    controlsDark: { backgroundColor: '#1e293b', borderTopColor: '#334155' },
    section: { paddingHorizontal: 20, paddingVertical: 12 },
    sectionLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 12, textTransform: 'uppercase' },
    brushTypeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    brushTypeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    brushTypeBtnDark: { backgroundColor: '#0f172a' },
    brushTypeBtnActive: {
        backgroundColor: '#EEF2FF',
        borderColor: '#6366f1',
    },
    brushTypeBtnActiveDark: { backgroundColor: '#312e81' },
    brushTypeText: { fontSize: 12, fontWeight: '500', color: '#6B7280' },
    brushTypeTextActive: { color: '#6366f1', fontWeight: '600' },
    sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    brushPreview: { borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB' },
    slider: { width: '100%', height: 40 },
    sliderValue: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 4 },
    colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    colorBtn: { width: 36, height: 36, borderRadius: 18 },
    selectedColor: { borderWidth: 3, borderColor: '#6366f1', transform: [{ scale: 1.1 }] },
    whiteColorBorder: { borderWidth: 1, borderColor: '#E5E7EB' },
    actionsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 8 },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 12,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
    },
    actionBtnDark: { backgroundColor: '#0f172a' },
    actionBtnDanger: { backgroundColor: '#FEF2F2' },
    actionBtnText: { fontSize: 14, fontWeight: '600', color: '#374151' },
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

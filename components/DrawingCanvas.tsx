import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions, PanResponder } from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

type DrawingCanvasProps = {
    onDrawingSaved: (svgData: string) => void;
    onDrawingDeleted?: () => void;
    existingDrawing?: string;
};

const DRAWING_COLORS = [
    '#000000', // Black
    '#EF4444', // Red
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#8B5CF6', // Purple
    '#EC4899', // Pink
];

type PathData = {
    path: string;
    color: string;
    strokeWidth: number;
};

export default function DrawingCanvas({ onDrawingSaved, onDrawingDeleted, existingDrawing }: DrawingCanvasProps) {
    const { isDarkMode } = useTheme();
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawing, setHasDrawing] = useState(!!existingDrawing);
    const [selectedColor, setSelectedColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(3);
    const [paths, setPaths] = useState<PathData[]>([]);
    const [currentPath, setCurrentPath] = useState<string>('');

    const panResponder = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
            const { locationX, locationY } = evt.nativeEvent;
            setCurrentPath(`M${locationX},${locationY}`);
        },
        onPanResponderMove: (evt) => {
            const { locationX, locationY } = evt.nativeEvent;
            setCurrentPath((prev) => `${prev} L${locationX},${locationY}`);
        },
        onPanResponderRelease: () => {
            if (currentPath) {
                setPaths([...paths, { path: currentPath, color: selectedColor, strokeWidth: brushSize }]);
                setCurrentPath('');
            }
        },
    });

    const openDrawingModal = () => {
        setIsDrawing(true);
    };

    const closeDrawingModal = () => {
        setIsDrawing(false);
    };

    const saveDrawing = () => {
        // Convert paths to SVG string
        const svgData = JSON.stringify(paths);
        onDrawingSaved(svgData);
        setHasDrawing(true);
        closeDrawingModal();
    };

    const clearCanvas = () => {
        setPaths([]);
        setCurrentPath('');
    };

    const undoLastStroke = () => {
        setPaths(paths.slice(0, -1));
    };

    const deleteDrawing = () => {
        setHasDrawing(false);
        setPaths([]);
        setCurrentPath('');
        if (onDrawingDeleted) {
            onDrawingDeleted();
        }
    };

    return (
        <View style={styles.container}>
            {!hasDrawing ? (
                <TouchableOpacity
                    style={[styles.openButton, isDarkMode && styles.buttonDark]}
                    onPress={openDrawingModal}
                >
                    <Feather name="edit-3" size={20} color="#6366f1" />
                    <Text style={styles.openButtonText}>Create Drawing</Text>
                </TouchableOpacity>
            ) : (
                <View style={[styles.drawingPreview, isDarkMode && styles.drawingPreviewDark]}>
                    <Feather name="image" size={24} color="#6366f1" />
                    <View style={styles.drawingInfo}>
                        <Text style={[styles.drawingLabel, isDarkMode && styles.textDark]}>Drawing Attached</Text>
                        <TouchableOpacity onPress={openDrawingModal}>
                            <Text style={styles.editText}>Edit</Text>
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={deleteDrawing}>
                        <Feather name="trash-2" size={20} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            )}

            <Modal
                visible={isDrawing}
                animationType="slide"
                onRequestClose={closeDrawingModal}
            >
                <View style={[styles.modalContainer, isDarkMode && styles.modalContainerDark]}>
                    {/* Header */}
                    <View style={[styles.header, isDarkMode && styles.headerDark]}>
                        <TouchableOpacity onPress={closeDrawingModal}>
                            <Feather name="x" size={24} color={isDarkMode ? "#f8fafc" : "#374151"} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, isDarkMode && styles.textDark]}>Draw</Text>
                        <TouchableOpacity onPress={saveDrawing} style={styles.saveButton}>
                            <Text style={styles.saveButtonText}>Save</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Drawing Canvas */}
                    <View style={styles.canvasContainer} {...panResponder.panHandlers}>
                        <Svg
                            height={Dimensions.get('window').height - 200}
                            width={Dimensions.get('window').width}
                            style={styles.canvas}
                        >
                            {paths.map((pathData, index) => (
                                <Path
                                    key={index}
                                    d={pathData.path}
                                    stroke={pathData.color}
                                    strokeWidth={pathData.strokeWidth}
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            ))}
                            {currentPath && (
                                <Path
                                    d={currentPath}
                                    stroke={selectedColor}
                                    strokeWidth={brushSize}
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            )}
                        </Svg>
                    </View>

                    {/* Tools */}
                    <View style={[styles.toolsContainer, isDarkMode && styles.toolsContainerDark]}>
                        {/* Color Picker */}
                        <View style={styles.colorPicker}>
                            {DRAWING_COLORS.map((color) => (
                                <TouchableOpacity
                                    key={color}
                                    style={[
                                        styles.colorOption,
                                        { backgroundColor: color },
                                        selectedColor === color && styles.selectedColorOption,
                                    ]}
                                    onPress={() => setSelectedColor(color)}
                                />
                            ))}
                        </View>

                        {/* Brush Size */}
                        <View style={styles.brushSizeContainer}>
                            {[2, 4, 6, 8].map((size) => (
                                <TouchableOpacity
                                    key={size}
                                    style={[
                                        styles.brushSizeOption,
                                        isDarkMode && styles.brushSizeOptionDark,
                                        brushSize === size && styles.selectedBrushSize,
                                    ]}
                                    onPress={() => setBrushSize(size)}
                                >
                                    <View
                                        style={{
                                            width: size * 2,
                                            height: size * 2,
                                            borderRadius: size,
                                            backgroundColor: '#374151',
                                        }}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={[styles.actionButton, isDarkMode && styles.actionButtonDark]}
                                onPress={undoLastStroke}
                            >
                                <Feather name="corner-up-left" size={20} color="#6366f1" />
                                <Text style={styles.actionButtonText}>Undo</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionButton, isDarkMode && styles.actionButtonDark]}
                                onPress={clearCanvas}
                            >
                                <Feather name="trash-2" size={20} color="#EF4444" />
                                <Text style={styles.actionButtonText}>Clear</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 12,
    },
    openButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EEF2FF',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        gap: 8,
    },
    openButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6366f1',
    },
    drawingPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 12,
        gap: 12,
    },
    drawingPreviewDark: {
        backgroundColor: '#1e293b',
    },
    drawingInfo: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    drawingLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    editText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6366f1',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    modalContainerDark: {
        backgroundColor: '#0f172a',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerDark: {
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    saveButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#EEF2FF',
        borderRadius: 8,
    },
    saveButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#6366f1',
    },
    canvasContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    canvas: {
        backgroundColor: '#FFFFFF',
    },
    toolsContainer: {
        padding: 16,
        backgroundColor: '#F9FAFB',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    toolsContainerDark: {
        backgroundColor: '#1e293b',
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
    },
    colorPicker: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 16,
    },
    colorOption: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    selectedColorOption: {
        borderColor: '#6366f1',
        borderWidth: 3,
    },
    brushSizeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 16,
    },
    brushSizeOption: {
        width: 48,
        height: 48,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    brushSizeOptionDark: {
        backgroundColor: '#334155',
    },
    selectedBrushSize: {
        backgroundColor: '#EEF2FF',
        borderWidth: 2,
        borderColor: '#6366f1',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F3F4F6',
        paddingVertical: 12,
        borderRadius: 8,
        gap: 6,
    },
    actionButtonDark: {
        backgroundColor: '#334155',
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    buttonDark: {
        backgroundColor: '#1e293b',
    },
    textDark: {
        color: '#f8fafc',
    },
});

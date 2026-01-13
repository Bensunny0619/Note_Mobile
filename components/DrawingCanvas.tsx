import React, { useState, useRef, forwardRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions, ActivityIndicator } from 'react-native';
import SignatureScreen, { SignatureViewRef } from 'react-native-signature-canvas';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import * as FileSystem from 'expo-file-system/legacy';

type DrawingCanvasProps = {
    onDrawingSaved: (imageUri: string) => void;
    onDrawingDeleted?: () => void;
    existingDrawing?: string;
};

const COLORS = ['#000000', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
const BRUSH_SIZES = [2, 4, 6, 8];

export default function DrawingCanvas({ onDrawingSaved, onDrawingDeleted, existingDrawing }: DrawingCanvasProps) {
    const { isDarkMode } = useTheme();
    const signatureRef = useRef<SignatureViewRef>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawing, setHasDrawing] = useState(!!existingDrawing);
    const [selectedColor, setSelectedColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(4);
    const [saving, setSaving] = useState(false);

    // Initial style for the webview canvas
    const webStyle = `
        .m-signature-pad { 
            box-shadow: none; 
            border: none; 
            background-color: transparent;
        } 
        .m-signature-pad--body {
            border: none;
        }
        .m-signature-pad--footer {
            display: none; 
            margin: 0px;
        }
        body,html { 
            width: 100%; height: 100%; 
            background-color: #ffffff;
        }
    `;

    const handleOK = async (signature: string) => {
        try {
            setSaving(true);
            // signature is a base64 string (data:image/png;base64,...)
            // Remove the prefix
            const base64Code = signature.replace('data:image/png;base64,', '');

            // Create a temporary file path
            const filename = `${FileSystem.cacheDirectory}drawing_${Date.now()}.png`;

            // Write to file
            await FileSystem.writeAsStringAsync(filename, base64Code, {
                encoding: 'base64',
            });

            onDrawingSaved(filename);
            setHasDrawing(true);
            setIsDrawing(false);
        } catch (error) {
            console.error('Error saving drawing:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleClear = () => {
        signatureRef.current?.clearSignature();
    };

    const handleUndo = () => {
        signatureRef.current?.undo();
    };

    const handleSave = () => {
        signatureRef.current?.readSignature();
    };

    const changeColor = (color: string) => {
        setSelectedColor(color);
        signatureRef.current?.changePenColor(color);
    };

    const changeSize = (size: number) => {
        setBrushSize(size);
        signatureRef.current?.changePenSize(size, size);
    };

    const deleteDrawing = () => {
        setHasDrawing(false);
        onDrawingDeleted?.();
    };

    if (hasDrawing && !isDrawing) {
        return (
            <View style={styles.container}>
                <View style={[styles.preview, isDarkMode && styles.previewDark]}>
                    <Feather name="edit-3" size={20} color="#6366f1" />
                    <Text style={[styles.previewText, isDarkMode && styles.textDark]}>Drawing attached</Text>
                    <TouchableOpacity onPress={() => setIsDrawing(true)} style={styles.editBtn}>
                        <Text style={styles.editText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={deleteDrawing}>
                        <Feather name="trash-2" size={20} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (!isDrawing) {
        return (
            <View style={styles.container}>
                <TouchableOpacity style={styles.openBtn} onPress={() => setIsDrawing(true)}>
                    <Feather name="edit-3" size={20} color="#6366f1" />
                    <Text style={styles.openBtnText}>Add Drawing</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <Modal visible={isDrawing} animationType="slide" onRequestClose={() => setIsDrawing(false)}>
            <View style={[styles.modal, isDarkMode && styles.modalDark]}>
                {/* Header */}
                <View style={[styles.header, isDarkMode && styles.headerDark]}>
                    <TouchableOpacity onPress={() => setIsDrawing(false)}>
                        <Feather name="x" size={24} color={isDarkMode ? '#fff' : '#000'} />
                    </TouchableOpacity>
                    <Text style={[styles.title, isDarkMode && styles.titleDark]}>Draw</Text>
                    <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={saving}>
                        {saving ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.saveBtnText}>Done</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Canvas */}
                <View style={styles.canvasWrapper}>
                    <SignatureScreen
                        ref={signatureRef}
                        onOK={handleOK}
                        webStyle={webStyle}
                        descriptionText="Sign"
                        clearText="Clear"
                        confirmText="Save"
                        minWidth={brushSize}
                        maxWidth={brushSize}
                        penColor={selectedColor}
                        backgroundColor="#ffffff"
                        style={styles.canvas}
                    />
                </View>

                {/* Tools */}
                <View style={[styles.tools, isDarkMode && styles.toolsDark]}>
                    {/* Colors */}
                    <View style={styles.row}>
                        {COLORS.map(color => (
                            <TouchableOpacity
                                key={color}
                                style={[
                                    styles.colorBtn,
                                    { backgroundColor: color },
                                    selectedColor === color && styles.selectedColor,
                                ]}
                                onPress={() => changeColor(color)}
                            />
                        ))}
                    </View>

                    {/* Brush Sizes */}
                    <View style={styles.row}>
                        {BRUSH_SIZES.map(size => (
                            <TouchableOpacity
                                key={size}
                                style={[styles.sizeBtn, brushSize === size && styles.selectedSize]}
                                onPress={() => changeSize(size)}
                            >
                                <View style={[styles.sizeDot, { width: size * 2, height: size * 2, borderRadius: size }]} />
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Actions */}
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.actionBtn} onPress={handleUndo}>
                            <Feather name="corner-up-left" size={20} color="#6366f1" />
                            <Text style={styles.actionText}>Undo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={handleClear}>
                            <Feather name="trash-2" size={20} color="#EF4444" />
                            <Text style={styles.actionText}>Clear</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 12,
    },
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
    openBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6366f1',
    },
    preview: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    previewDark: {
        backgroundColor: '#1e293b',
    },
    previewText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
    },
    textDark: {
        color: '#cbd5e1',
    },
    editBtn: {
        marginRight: 8,
    },
    editText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6366f1',
    },
    modal: {
        flex: 1,
        backgroundColor: '#fff',
    },
    modalDark: {
        backgroundColor: '#0f172a',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerDark: {
        borderBottomColor: '#334155',
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    titleDark: {
        color: '#f8fafc',
    },
    saveBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#6366f1',
        borderRadius: 8,
        minWidth: 60,
        alignItems: 'center',
    },
    saveBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    canvasWrapper: {
        flex: 1,
        width: '100%',
    },
    canvas: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    tools: {
        backgroundColor: '#fff',
        paddingVertical: 20,
        paddingHorizontal: 20,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        gap: 16,
    },
    toolsDark: {
        backgroundColor: '#1e293b',
        borderTopColor: '#334155',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
    },
    colorBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 3,
        borderColor: 'transparent',
    },
    selectedColor: {
        borderColor: '#6366f1',
    },
    sizeBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    selectedSize: {
        backgroundColor: '#EEF2FF',
        borderColor: '#6366f1',
    },
    sizeDot: {
        backgroundColor: '#374151',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        backgroundColor: '#F3F4F6',
        flex: 1,
        justifyContent: 'center',
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
});

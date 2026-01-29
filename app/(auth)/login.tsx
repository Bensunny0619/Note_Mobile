import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);

        try {
            const response = await api.post('/auth/login', {
                email,
                password,
            });

            const { access_token, user } = response.data;
            await login(access_token, user);
        } catch (error: any) {
            console.error("Login Error:", error.response?.data || error.message);

            let message = 'Login failed';
            const errorData = error.response?.data;

            if (errorData?.message) {
                message = errorData.message;
            } else if (errorData?.error) {
                message = errorData.error;
            }

            if (errorData?.errors) {
                const validationErrors = Object.values(errorData.errors).flat().join('\n');
                message += `\n${validationErrors}`;
            }

            Alert.alert('Login Error', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.logoContainer}>
                    <Text style={styles.logoText}>Homa</Text>
                    <View style={styles.logoDot} />
                </View>
                <Text style={styles.tagline}>The home of your notes</Text>

                {__DEV__ && (
                    <View style={{ marginTop: 10, padding: 8, backgroundColor: '#F3F4F6', borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, color: '#6B7280' }}>DEBUG: {api.defaults.baseURL}</Text>
                    </View>
                )}
            </View>

            <View style={styles.formContainer}>
                <Text style={styles.welcomeTitle}>Welcome Back</Text>
                <Text style={styles.welcomeSubtitle}>Start keeping your notes in a safe home</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Type your email"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                </View>

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleLogin}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.buttonText}>Login</Text>
                    )}
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Don't have an account? </Text>
                    <Link href="/register" asChild>
                        <TouchableOpacity>
                            <Text style={styles.footerLink}>Signup</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 24,
    },
    header: {
        marginTop: 60,
        marginBottom: 40,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    logoText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    logoDot: {
        width: 12,
        height: 8,
        backgroundColor: '#6366f1',
        marginLeft: 4,
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10,
    },
    tagline: {
        fontSize: 16,
        color: '#6B7280',
        marginTop: 4,
    },
    formContainer: {
        flex: 1,
    },
    welcomeTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 8,
    },
    welcomeSubtitle: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 32,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 16,
        backgroundColor: '#F9FAFB',
        fontSize: 16,
    },
    button: {
        height: 50,
        backgroundColor: '#6366f1',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
    },
    footerText: {
        color: '#6B7280',
        fontSize: 14,
    },
    footerLink: {
        color: '#6366f1',
        fontSize: 14,
        fontWeight: 'bold',
    },
});

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();

    const handleRegister = async () => {
        if (!name || !email || !password || !passwordConfirmation) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (password !== passwordConfirmation) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const response = await api.post('/auth/register', {
                name,
                email,
                password,
                password_confirmation: passwordConfirmation,
            });

            const { access_token, user } = response.data;
            await register(access_token, user);
        } catch (error: any) {
            console.error("Register Error:", error.response?.data || error.message);

            let message = 'Registration failed';
            const errorData = error.response?.data;

            if (errorData?.message) {
                message = errorData.message;
            }

            if (errorData?.errors) {
                const validationErrors = Object.values(errorData.errors).flat().join('\n');
                message += `\n${validationErrors}`;
            }

            Alert.alert('Error', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <Text style={styles.logoText}>Homa</Text>
                        <View style={styles.logoDot} />
                    </View>
                    <Text style={styles.tagline}>The home of your notes</Text>
                </View>

                <View style={styles.formContainer}>
                    <Text style={styles.welcomeTitle}>Welcome to Homa</Text>
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
                        <Text style={styles.label}>Name or Username</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Name or Username"
                            value={name}
                            onChangeText={setName}
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

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Confirm Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Confirm Password"
                            value={passwordConfirmation}
                            onChangeText={setPasswordConfirmation}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.buttonText}>Signup</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <Link href="/login" asChild>
                            <TouchableOpacity>
                                <Text style={styles.footerLink}>Login</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContainer: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    header: {
        marginTop: 40,
        marginBottom: 30,
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

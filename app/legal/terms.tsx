import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { Stack } from 'expo-router';

export default function TermsOfService() {
    const { isDarkMode } = useTheme();

    return (
        <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
            <Stack.Screen
                options={{
                    title: 'Terms of Service',
                    headerStyle: {
                        backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                    },
                    headerTintColor: isDarkMode ? '#f8fafc' : '#1F2937',
                }}
            />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={[styles.title, isDarkMode && styles.textDark]}>
                    Terms of Service
                </Text>

                <Text style={[styles.lastUpdated, isDarkMode && styles.textSecondaryDark]}>
                    Last Updated: January 21, 2026
                </Text>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
                        1. Acceptance of Terms
                    </Text>
                    <Text style={[styles.paragraph, isDarkMode && styles.textSecondaryDark]}>
                        By accessing and using Homa Notes ("the App"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
                        2. Use License
                    </Text>
                    <Text style={[styles.paragraph, isDarkMode && styles.textSecondaryDark]}>
                        Permission is granted to temporarily download one copy of the App for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
                    </Text>
                    <Text style={[styles.bulletPoint, isDarkMode && styles.textSecondaryDark]}>
                        • Modify or copy the materials
                    </Text>
                    <Text style={[styles.bulletPoint, isDarkMode && styles.textSecondaryDark]}>
                        • Use the materials for any commercial purpose or for any public display
                    </Text>
                    <Text style={[styles.bulletPoint, isDarkMode && styles.textSecondaryDark]}>
                        • Attempt to reverse engineer any software contained in the App
                    </Text>
                    <Text style={[styles.bulletPoint, isDarkMode && styles.textSecondaryDark]}>
                        • Remove any copyright or other proprietary notations from the materials
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
                        3. User Account
                    </Text>
                    <Text style={[styles.paragraph, isDarkMode && styles.textSecondaryDark]}>
                        You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account or password. We reserve the right to refuse service, terminate accounts, or remove or edit content at our sole discretion.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
                        4. User Content
                    </Text>
                    <Text style={[styles.paragraph, isDarkMode && styles.textSecondaryDark]}>
                        You retain all rights to the content you create and store in the App. By using the App, you grant us a license to store, backup, and display your content solely for the purpose of providing the service to you. We do not claim ownership of your content.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
                        5. Prohibited Uses
                    </Text>
                    <Text style={[styles.paragraph, isDarkMode && styles.textSecondaryDark]}>
                        You may not use the App:
                    </Text>
                    <Text style={[styles.bulletPoint, isDarkMode && styles.textSecondaryDark]}>
                        • In any way that violates any applicable national or international law or regulation
                    </Text>
                    <Text style={[styles.bulletPoint, isDarkMode && styles.textSecondaryDark]}>
                        • To transmit, or procure the sending of, any advertising or promotional material without our prior written consent
                    </Text>
                    <Text style={[styles.bulletPoint, isDarkMode && styles.textSecondaryDark]}>
                        • To impersonate or attempt to impersonate the Company, a Company employee, another user, or any other person or entity
                    </Text>
                    <Text style={[styles.bulletPoint, isDarkMode && styles.textSecondaryDark]}>
                        • To engage in any other conduct that restricts or inhibits anyone's use or enjoyment of the App
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
                        6. Service Availability
                    </Text>
                    <Text style={[styles.paragraph, isDarkMode && styles.textSecondaryDark]}>
                        We strive to provide continuous service, but we do not guarantee that the App will be available at all times. We may experience hardware, software, or other problems or need to perform maintenance related to the App, resulting in interruptions, delays, or errors.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
                        7. Disclaimer
                    </Text>
                    <Text style={[styles.paragraph, isDarkMode && styles.textSecondaryDark]}>
                        The App is provided on an "as is" and "as available" basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
                        8. Limitation of Liability
                    </Text>
                    <Text style={[styles.paragraph, isDarkMode && styles.textSecondaryDark]}>
                        In no event shall Homa Notes or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the App, even if we have been notified orally or in writing of the possibility of such damage.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
                        9. Data Backup
                    </Text>
                    <Text style={[styles.paragraph, isDarkMode && styles.textSecondaryDark]}>
                        While we implement backup procedures, you are solely responsible for maintaining your own backup copies of your content. We are not responsible for any loss or corruption of your data.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
                        10. Modifications to Terms
                    </Text>
                    <Text style={[styles.paragraph, isDarkMode && styles.textSecondaryDark]}>
                        We reserve the right to revise these terms of service at any time without notice. By using this App, you are agreeing to be bound by the then-current version of these terms of service.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
                        11. Termination
                    </Text>
                    <Text style={[styles.paragraph, isDarkMode && styles.textSecondaryDark]}>
                        We may terminate or suspend your account and bar access to the App immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever, including without limitation if you breach the Terms.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
                        12. Governing Law
                    </Text>
                    <Text style={[styles.paragraph, isDarkMode && styles.textSecondaryDark]}>
                        These terms shall be governed and construed in accordance with the laws of your jurisdiction, without regard to its conflict of law provisions.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
                        13. Contact Information
                    </Text>
                    <Text style={[styles.paragraph, isDarkMode && styles.textSecondaryDark]}>
                        If you have any questions about these Terms, please contact us at support@homanotes.com
                    </Text>
                </View>

                <View style={styles.footer}>
                    <Text style={[styles.footerText, isDarkMode && styles.textSecondaryDark]}>
                        © 2026 Homa Notes. All rights reserved.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    containerDark: {
        backgroundColor: '#0f172a',
    },
    scrollContent: {
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 8,
    },
    lastUpdated: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 24,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 12,
    },
    paragraph: {
        fontSize: 15,
        lineHeight: 24,
        color: '#4B5563',
        marginBottom: 8,
    },
    bulletPoint: {
        fontSize: 15,
        lineHeight: 24,
        color: '#4B5563',
        marginLeft: 8,
        marginBottom: 4,
    },
    footer: {
        marginTop: 32,
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 13,
        color: '#9CA3AF',
    },
    textDark: {
        color: '#f8fafc',
    },
    textSecondaryDark: {
        color: '#cbd5e1',
    },
});

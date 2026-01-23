import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { Stack } from 'expo-router';

export default function PrivacyPolicy() {
    const { isDarkMode } = useTheme();

    return (
        <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
            <Stack.Screen
                options={{
                    title: 'Privacy Policy',
                    headerStyle: {
                        backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                    },
                    headerTintColor: isDarkMode ? '#f8fafc' : '#1F2937',
                }}
            />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={[styles.title, isDarkMode && styles.textDark]}>
                    Privacy Policy
                </Text>

                <Text style={[styles.lastUpdated, isDarkMode && styles.textSecondaryDark]}>
                    Last Updated: January 21, 2026
                </Text>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
                        1. Introduction
                    </Text>
                    <Text style={[styles.paragraph, isDarkMode && styles.textSecondaryDark]}>
                        Welcome to Homa Notes ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
                        2. Information We Collect
                    </Text>
                    <Text style={[styles.paragraph, isDarkMode && styles.textSecondaryDark]}>
                        We collect information that you provide directly to us when you:
                    </Text>
                    <Text style={[styles.bulletPoint, isDarkMode && styles.textSecondaryDark]}>
                        • Create an account (name, email address, password)
                    </Text>
                    <Text style={[styles.bulletPoint, isDarkMode && styles.textSecondaryDark]}>
                        • Create, edit, or share notes and content
                    </Text>
                    <Text style={[styles.bulletPoint, isDarkMode && styles.textSecondaryDark]}>
                        • Upload images, audio recordings, or drawings
                    </Text>
                    <Text style={[styles.bulletPoint, isDarkMode && styles.textSecondaryDark]}>
                        • Set reminders and labels
                    </Text>
                    <Text style={[styles.bulletPoint, isDarkMode && styles.textSecondaryDark]}>
                        • Communicate with us for support
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
                        3. Automatically Collected Information
                    </Text>
                    <Text style={[styles.paragraph, isDarkMode && styles.textSecondaryDark]}>
                        When you use the App, we may automatically collect certain information, including:
                    </Text>
                    <Text style={[styles.bulletPoint, isDarkMode && styles.textSecondaryDark]}>
                        • Device information (model, operating system, unique device identifiers)
                    </Text>
                    <Text style={[styles.bulletPoint, isDarkMode && styles.textSecondaryDark]}>
                        • Usage data (features used, time spent in the app)
                    </Text>
                    <Text style={[styles.bulletPoint, isDarkMode && styles.textSecondaryDark]}>
                        • Log data (IP address, access times, app crashes)
                    </Text>
                    <Text style={[styles.bulletPoint, isDarkMode && styles.textSecondaryDark]}>
                        • Location data (if you grant permission)
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
                        4. How We Use Your Information
                    </Text>
                    <Text style={[styles.paragraph, isDarkMode && styles.textSecondaryDark]}>
                        We use the information we collect to:
                    </Text>
                    <Text style={[styles.bulletPoint, isDarkMode && styles.textSecondaryDark]}>
                        • Provide, maintain, and improve our services
                    </Text>
                    <Text style={[styles.bulletPoint, isDarkMode && styles.textSecondaryDark]}>
                        • Create and manage your account
                    </Text>
                    <Text style={[styles.bulletPoint, isDarkMode && styles.textSecondaryDark]}>
                        • Sync your notes across devices
                    </Text>
                    <Text style={[styles.bulletPoint, isDarkMode && styles.textSecondaryDark]}>
                        • Send you reminders and notifications
                    </Text>
                    <Text style={[styles.bulletPoint, isDarkMode && styles.textSecondaryDark]}>
                        • Respond to your comments and questions
                    </Text>
                    <Text style={[styles.bulletPoint, isDarkMode && styles.textSecondaryDark]}>
                        • Detect, prevent, and address technical issues
                    </Text>
                    <Text style={[styles.bulletPoint, isDarkMode && styles.textSecondaryDark]}>
                        • Analyze usage patterns to improve user experience
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
                        5. Data Storage and Security
                    </Text>
                    <Text style={[styles.paragraph, isDarkMode && styles.textSecondaryDark]}>
                        We implement appropriate technical and organizational security measures to protect your personal information. Your data is encrypted both in transit and at rest. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
                        6. Data Sharing and Disclosure
                    </Text>
                    <Text style={[styles.paragraph, isDarkMode && styles.textSecondaryDark]}>
                        We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
                    </Text>
                    <Text style={[styles.bulletPoint, isDarkMode && styles.textSecondaryDark]}>
                        • With your consent or at your direction
                    </Text>
                    <Text style={[styles.bulletPoint, isDarkMode && styles.textSecondaryDark]}>
                        • With service providers who assist us in operating the App
                    </Text>
                    <Text style={[styles.bulletPoint, isDarkMode && styles.textSecondaryDark]}>
                        • To comply with legal obligations or respond to lawful requests
                    </Text>
                    <Text style={[styles.bulletPoint, isDarkMode && styles.textSecondaryDark]}>
                        • To protect our rights, privacy, safety, or property
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
                        7. Data Retention
                    </Text>
                    <Text style={[styles.paragraph, isDarkMode && styles.textSecondaryDark]}>
                        We retain your personal information for as long as necessary to provide you with our services and as described in this Privacy Policy. When you delete your account, we will delete your personal information, except where we are required to retain it for legal purposes.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
                        8. Your Privacy Rights
                    </Text>
                    <Text style={[styles.paragraph, isDarkMode && styles.textSecondaryDark]}>
                        Depending on your location, you may have the following rights:
                    </Text>
                    <Text style={[styles.bulletPoint, isDarkMode && styles.textSecondaryDark]}>
                        • Access: Request a copy of your personal information
                    </Text>
                    <Text style={[styles.bulletPoint, isDarkMode && styles.textSecondaryDark]}>
                        • Correction: Request correction of inaccurate information
                    </Text>
                    <Text style={[styles.bulletPoint, isDarkMode && styles.textSecondaryDark]}>
                        • Deletion: Request deletion of your personal information
                    </Text>
                    <Text style={[styles.bulletPoint, isDarkMode && styles.textSecondaryDark]}>
                        • Portability: Request transfer of your data to another service
                    </Text>
                    <Text style={[styles.bulletPoint, isDarkMode && styles.textSecondaryDark]}>
                        • Objection: Object to our processing of your information
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
                        9. Children's Privacy
                    </Text>
                    <Text style={[styles.paragraph, isDarkMode && styles.textSecondaryDark]}>
                        Our App is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
                        10. Third-Party Services
                    </Text>
                    <Text style={[styles.paragraph, isDarkMode && styles.textSecondaryDark]}>
                        Our App may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to read their privacy policies before providing any information to them.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
                        11. International Data Transfers
                    </Text>
                    <Text style={[styles.paragraph, isDarkMode && styles.textSecondaryDark]}>
                        Your information may be transferred to and maintained on servers located outside of your state, province, country, or other governmental jurisdiction where data protection laws may differ. By using the App, you consent to such transfers.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
                        12. Cookies and Tracking Technologies
                    </Text>
                    <Text style={[styles.paragraph, isDarkMode && styles.textSecondaryDark]}>
                        We may use cookies and similar tracking technologies to track activity on our App and store certain information. You can instruct your device to refuse all cookies or to indicate when a cookie is being sent.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
                        13. Changes to This Privacy Policy
                    </Text>
                    <Text style={[styles.paragraph, isDarkMode && styles.textSecondaryDark]}>
                        We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
                        14. Contact Us
                    </Text>
                    <Text style={[styles.paragraph, isDarkMode && styles.textSecondaryDark]}>
                        If you have any questions about this Privacy Policy, please contact us at:
                    </Text>
                    <Text style={[styles.bulletPoint, isDarkMode && styles.textSecondaryDark]}>
                        Email: privacy@homanotes.com
                    </Text>
                    <Text style={[styles.bulletPoint, isDarkMode && styles.textSecondaryDark]}>
                        Address: [Your Company Address]
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
                        15. GDPR Compliance (For EU Users)
                    </Text>
                    <Text style={[styles.paragraph, isDarkMode && styles.textSecondaryDark]}>
                        If you are located in the European Economic Area (EEA), you have certain data protection rights under GDPR. We aim to take reasonable steps to allow you to correct, amend, delete, or limit the use of your personal data.
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

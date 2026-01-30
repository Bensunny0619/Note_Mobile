# NoteApp - High-Performance Offline-First Note Taking

![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Laravel](https://img.shields.io/badge/Laravel-FF2D20?style=for-the-badge&logo=laravel&logoColor=white)

NoteApp is a sophisticated, professional-grade note-taking application built with **React Native (Expo)**. It features a robust offline-first architecture, real-time synchronization, and a rich multimedia experience including digital ink drawings and voice recordings.

## 🚀 Key Features

-   **📡 Offline-First Architecture**: Work seamlessly without internet. Changes are queued and automatically synced when connectivity returns.
-   **🔄 Real-Time Sync**: Instant cross-device synchronization powered by Laravel Echo and WebSockets.
-   **🎨 Digital Ink Drawing**: High-performance freehand drawing powered by `@shopify/react-native-skia`.
-   **🎙️ Voice Memos**: Integrated audio recording and global playback controls.
-   **🏷️ Smart Organization**: Categorize notes with a dynamic label system, archive, and trash functionality.
-   **🌓 Dark & Light Mode**: A beautifully crafted UI that respects system preferences or user choice.
-   **🏗️ Conflict Resolution**: Built-in UI to handle data conflicts between local and remote state.

## 🛠️ Tech Stack

-   **Frontend**: React Native, Expo, Expo Router (File-based routing)
-   **Styling**: NativeWind (Tailwind CSS for Native)
-   **State Management**: React Context API (Modular Providers)
-   **Database/Storage**: AsyncStorage (Notes/Metadata), SecureStore (Auth Tokens)
-   **Graphics**: React Native Skia
-   **Networking**: Axios, Laravel Echo, Pusher-js
-   **Real-time**: Laravel Reverb / Pusher

## 📂 Project Structure

```text
├── app/                  # Expo Router file-based navigation
│   ├── (auth)            # Authentication flow (Login/Register)
│   ├── (drawer)          # Main application drawer screens
│   └── notes/            # Individual note creation and editing
├── components/           # Atomic and compound UI components
│   ├── DrawingCanvas     # Skia-based high-performance drawing
│   ├── AudioRecorder     # Native audio recording interface
│   └── NoteCard          # Rich-preview note items
├── context/              # Global state providers (Auth, Theme, Audio, etc.)
├── services/             # Core business logic and infrastructure
│   ├── syncQueue.ts      # Offline synchronization engine
│   ├── offlineApi.ts     # Data access layer with offline support
│   └── echo.ts           # WebSocket/Real-time configuration
└── assets/               # Static resources and branding
```

## ⚙️ Getting Started

### Prerequisites
-   Node.js (LTS)
-   Expo Go on your mobile device (for testing)
-   A running Laravel backend (NoteApp Backend)

### Installation
1.  Clone the repository
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure your environment in `services/config.ts`:
    ```typescript
    const DEV_IP = 'YOUR_LOCAL_IP'; // Set your backend IP
    ```
4.  Launch the application:
    ```bash
    npx expo start
    ```

## 🔒 Security & Privacy
Notes are stored locally on the device. Authentication is handled via secure JWT tokens stored in `Expo SecureStore`, ensuring your data remains private and accessible only to you.

---

## 👨‍💻 Developer
Built with ❤️ by **Gbenga Odudare Emmanuel**. Optimized for performance and user experience.

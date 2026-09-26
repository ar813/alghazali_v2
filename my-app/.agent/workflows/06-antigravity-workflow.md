---
description: # Antigravity AI Build Workflow
---

# NOTE: ALL COMMAND TO INSTALL DIFFERENT PACKAGES AND DEPENDENCIES ARE ONLY EXECUTE USER ON THIER MANUAL TERMINAL, ANTIGRAVITY ONLY GIVE COPY/PASTE FORMAT BLOCK COMMANDS

## Step 1 — Initialize Project

- Create new Expo (React Native) project
- Theme: white + sleek green
- Setup TypeScript or JS

## Step 2 — Generate Folder Structure

Follow 02-folder-structure.md  
Create:

- Screens
- Components
- Theme
- Lib (firebase.js)
- Assets folder

## Step 3 — Install Packages

Commands:

- expo install expo-camera
- npm install react-native-qrcode-svg
- npm install firebase
- npm install nativewind
- npm install @react-navigation/native
- expo install react-native-screens react-native-safe-area-context

## Step 4 — Build Screens

- Login
- Dashboard
- Student List
- Add New Student
- QR Generator
- QR Scanner
- Attendance History

## Step 5 — Database Integration

- Connect firebase.js
- Add CRUD operations
- Test API endpoints

## Step 6 — UI Polishing

- Apply theme styles
- Add spacing and shadows

## Step 7 — Build Android APK

Use:
eas build -p android

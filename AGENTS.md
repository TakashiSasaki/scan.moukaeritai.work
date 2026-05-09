# Developer & AI Agent Guidelines

This document outlines the core architectural decisions, design patterns, and conventions used in this project to ensure consistency during collaborative development.

## 1. Project Overview
A cloud-based item tracking and inventory management application with QR/NFC scanning capabilities and image-based item identification.

## 2. Tech Stack
- **Frontend**: React 18+ (Vite), TypeScript, Tailwind CSS.
- **Backend/Database**: Firebase (Firestore, Authentication, Storage).
- **Icons**: Lucide React.
- **Scanning**: `html5-qrcode` for camera-based QR detection.

## 3. Design System
- **Theme**: Utilizes Material Design 3 (M3) inspired CSS variables (found in `index.css`).
  - Key tokens: `var(--primary)`, `var(--surface-container)`, `var(--on-surface)`.
- **Responsive Design**:
  - Desktop-first design but mobile-optimized code.
  - Interactive elements must support both hover (PC) and tap (Mobile) states.
- **Typography**: Clean sans-serif (Inter) for UI, high-contrast monospace for technical data (IDs, tags).

## 4. Feature-Specific Implementations

### Image Provisioning (`CaptureForm.tsx`)
- **Dual Input Strategy**: Uses separate `<input>` elements for file selection vs. camera capture (`capture="environment"`).
- **Multi-Method Support**: Supports Click-to-dialog, Drag-and-drop, and Camera-direct.
- **Interaction Model**:
  - PC: Hover triggers action menus.
  - Mobile: Tap toggles action menus (state-managed via `activeImageMenu`).

### QR Scanner (`Scanner.tsx`)
- **Initialization**: Delayed slightly to avoid race conditions with React StrictMode.
- **Viewfinder**: Custom overlay with "Scanning" indicator (pings) and viewfinder focus frame.
- **Layout**: The camera `video` element is forced to `object-cover` via `index.css` to match the UI's rounded-corner cards.

## 5. Development Constraints
- **Port**: Always runs on port **3000**.
- **HMR**: Disabled by platform. Rebuilds occur on file save/turn completion.
- **Environment Variables**: Use `.env.example` as a template. Client-side variables must be prefixed with `VITE_`.

## 6. Firebase Configuration
- **Firestore Rules**: Hardened ABAC (Attribute-Based Access Control) rules are stored in `firestore.rules`.
- **Blueprints**: `firebase-blueprint.json` acts as the source of truth for the database schema. Update this when adding fields/collections.

## 7. Communcation & Logs
- Critical errors during Firestore operations should be logged using the JSON-structured error format defined in `CaptureForm.tsx` or similar utility handlers to allow for AI-driven diagnostics.

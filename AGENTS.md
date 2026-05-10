# Developer & AI Agent Guidelines

> **🚨 CRITICAL DIRECTIVE FOR ALL AGENTS 🚨**
> This `AGENTS.md` file acts as the primary memory and source of truth for all architectural, design, and UI decisions in this project. **You MUST keep this file consistently updated** whenever you make new design decisions, add new database collections/storage rules, or alter the UI/UX flows. Do not let this file fall out of sync with the codebase.

This document outlines the core architectural decisions, design patterns, and conventions used in this project to ensure consistency during collaborative development.

## 1. Project Overview
A cloud-based item tracking and inventory management application with QR/NFC scanning capabilities and image-based item identification.

## 2. Tech Stack
- **Frontend**: React 18+ (Vite), TypeScript, Tailwind CSS.
- **Backend/Database**: Firebase (Firestore, Authentication, Storage).
- **Icons**: Lucide React.
- **Scanning**: `html5-qrcode` for camera-based QR detection.

## 3. Design System & UI Architecture
- **Theme**: Utilizes Material Design 3 (M3) inspired CSS variables (found in `index.css`).
  - Key tokens: `var(--primary)`, `var(--surface-container)`, `var(--on-surface)`.
- **Responsive Design**:
  - Desktop-first design but mobile-optimized code.
  - Interactive elements must support both hover (PC) and tap (Mobile) states.
- **Typography**: Clean sans-serif (Inter) for UI, high-contrast monospace for technical data (IDs, tags).
- **App Layout & Navigation**:
  - The entire application (including the Admin Panel) is built as a unified Single Page Application (SPA). We use a state-driven screen toggle approach (`type Screen = 'dashboard' | 'search' | 'capture' | 'scanner' | 'overview' | 'admin'`) rather than a traditional URL-based router (like `react-router`), maintaining state without hard page reloads or fragmented URL structures.
  - Primary navigation is handled by a Sticky Bottom Navigation bar which provides quick access to core functions and is optimized for one-handed use on mobile devices.

## 4. Feature-Specific Implementations

### Image Provisioning (`CaptureForm.tsx`)
- **Dual Input Strategy**: Uses separate `<input>` elements for file selection vs. camera capture (`capture="environment"`).
- **Multi-Method Support**: Supports Click-to-dialog, Drag-and-drop, and Camera-direct.
- **Compression & Settings**: WebP is the default format for optimal compression, falling back to JPEG if unsupported. Users can configure format, quality, and resolution in the User Settings panel (`UserSettingsPanel.tsx`) which is saved per-user in Firestore `/users/{uid}/settings`.
- **Interaction Model**:
  - PC: Hover triggers action menus.
  - Mobile: Tap toggles action menus (state-managed via `activeImageMenu`).

### QR Scanner (`Scanner.tsx`)
- **Initialization**: Delayed slightly to avoid race conditions with React StrictMode.
- **Viewfinder**: Custom overlay with "Scanning" indicator (pings) and viewfinder focus frame.
- **Layout**: The camera `video` element is forced to `object-cover` via `index.css` to match the UI's rounded-corner cards.

### Image Interaction & Metadata
- **Format Overlay**: All item images in the Dashboard, Search results, and Capture forms include a small, translucent overlay in the corner indicating the file format (e.g., JPEG, PNG). This is computed via `getImageFormatFromUrl` in `utils.ts`.
- **Long Press Metadata**: Users can long-press (or right-click/press-and-hold) any item image to trigger an `ImageMetadataDialog`. 
  - Implementation: Managed via the `useLongPress` hook and `triggerImageMetadata` event bus.
  - Data: Displays secure Firebase Storage metadata including Content-Type, File Size (formatted), Created At, and the full Storage Path.

## 5. Development Constraints
- **Port**: Always runs on port **3000**.
- **HMR**: Disabled by platform. Rebuilds occur on file save/turn completion.
- **Environment Variables**: Use `.env.example` as a template. Client-side variables must be prefixed with `VITE_`.

## 6. Firebase Configuration (Database & Storage)
- **Firestore Schema Architecture**:
  - `users/{uid}`: Synchronized from Firebase Auth. Stores user profiles.
  - `admins/{uid}`: Handles Role-Based Access Control (RBAC). The presence of a document grants admin privileges.
  - `items/{itemId}`: The core inventory document storing metadata, image URLs, QR/NFC references, and tags.
- **Cloud Storage Strategy**:
  - Images captured via the application are stored in the default Firebase Storage bucket.
  - Storage quotas and capacities are monitored by checking bucket metadata server-side (via Cloud Functions), surfacing infrastructure usage safely without exposing it to standard clients.
- **Firestore Rules**: Hardened ABAC (Attribute-Based Access Control) rules are stored in `firestore.rules`.
- **Blueprints**: `firebase-blueprint.json` acts as the source of truth for the database schema. Update this when adding fields/collections.

## 7. Authentication & Roles
- **User Sync**: Authenticated users through Firebase Auth are synchronized to the `users` Firestore collection (`/users/{uid}`) to store metadata and role information.
- **Admin Access**: Admin privileges are managed via the `admins` collection. If a document (`/admins/{uid}`) exists for a user, they are granted admin rights.
- **Admin Panel**: An `admin` screen (`AdminPanel.tsx`) provides high-level system metrics to users with administrative privileges.

## 8. Cloud Functions & Deployment
- **Generations (Gen 1 vs Gen 2)**: It is CRITICAL to use Cloud Functions **Gen 2** (e.g., `import { onCall, HttpsError } from "firebase-functions/v2/https"`). Attempting to deploy Gen 1 functions (e.g., `functions.https.onCall`) can result in deployment failures in GitHub Actions or Firebase CLI with errors like `Cannot set CPU on the functions ... because they are GCF gen 1`.
- **Metrics & Backend Logic**: To perform sensitive operations (e.g., fetching Storage Bucket sizes or querying Cloud Monitoring API for read/write metrics), a Cloud Functions setup is present in `/functions/`. Admin privileges are verified within the function runtime.
- **Cloud Monitoring API Filtering**: When using `@google-cloud/monitoring` to fetch metrics, explicitly filter to isolate this specific application's usage from the entire GCP project:
  - **Firestore**: Filter by `resource.labels.database_id` (e.g., `metric.type="firestore.googleapis.com/document/read_count" AND resource.labels.database_id="<db_id>"`).
  - **Gemini**: Filter by `metric.labels.credential_id` (e.g., `metric.type="serviceruntime.googleapis.com/api/request_count" AND resource.labels.service="generativelanguage.googleapis.com" AND metric.labels.credential_id="apikey:<api_key>"`).
- **AI & Gemini Processing (Approach B)**: API keys are strictly hidden from the frontend. AI generation (matching images, description building) natively happens in Firebase Callable Functions using the `@google/genai` SDK and Firebase Secret Manager (`GEMINI_API_KEY`).
- **CI/CD**: Firebase Functions deployment is handled automatically via a GitHub Actions workflow (`.github/workflows/deploy-functions.yml`) upon pushes to `main`.
- **Deployment Strategy**: We intentionally retain older functions. Therefore, deployments should perform differential updates without forcefully deleting functions that exist in the cloud but are missing from the local source code.
- **Incremental Deployment (GitHub Actions)**: To avoid errors such as `'The following functions are found in your project but do not exist in your local source code... Aborting because deletion cannot proceed in non-interactive mode'`, the deployment command in `.github/workflows/deploy-functions.yml` MUST specify individual functions explicitly using `--only "functions:funcA,functions:funcB"`. This circumvents the interactive deletion prompt for outdated deployed functions.
- **Workflow Synchronization (CRITICAL)**: Whenever you add, rename, or remove a Cloud Function in `/functions/src/index.ts`, you MUST simultaneously update the `--only` flag in `.github/workflows/deploy-functions.yml` to reflect the exact list of functions. Failure to do so will result in deployment mismatches and missing functions.

## 9. Communication & Logs
- Critical errors during Firestore operations should be logged using the JSON-structured error format defined in `CaptureForm.tsx` or similar utility handlers to allow for AI-driven diagnostics.

## 10. Image Provisioning Specifications

This section defines the specifications for adding "Main Photo" and "Surroundings" (Peripheral Photos) in the item creation/editing form.

### Common Specifications
- **Target Slots**: 2 types ("Main Photo" (1 image) and "Surroundings" (Multiple images)).
- **Feedback**: Display progress indicator (spin animation) during upload.
- **Data Consistency**: Restrict actions like "Save" until upload is complete, or update state after completion.
- **Error Handling**: Notify users via toast etc. for non-image files or load failures.

### Desktop Display (PC)
For PC environments, support intuitive operations utilizing mouse controls and large screens.
- **Drag & Drop**:
  - Image files can be directly dropped into the area from outside the browser.
  - Highlight the target area (border/background color) during drag to visually indicate drop availability.
- **Hover Menu**:
  - Display an overlay menu when the mouse cursor hovers over the image area.
  - Provide options for "Upload (file selection dialog)" and "Take Photo (webcam activation)".
- **Click Operation**:
  - Clicking the area directly opens the file selection dialog or fixes the menu display.

### Mobile Display (Smartphones/Tablets)
For mobile environments, prioritize touch operation characteristics and OS standard camera/photo library integration.
- **Tap to Select Menu**:
  - Tapping the image area displays the menu as an overlay (since hover is not available, state toggles on tap).
  - Tapping outside the menu closes it.
- **Camera Integration**:
  - When "Take Photo" is selected, launch the OS standard camera app (`capture="environment"`) and prioritize the rear camera.
- **Library Integration**:
  - When "Upload" is selected, images can be chosen from the device's photo library or file browser.

### Technical Implementation Notes
- **Input Element Separation**: Separate input elements with the `capture` attribute (for camera) and without (for file selection) to ensure the user's intended action executes reliably.
- **Reference Attribute**: Add `referrerPolicy="no-referrer"` to `img` tags to ensure reliable loading from Firebase Storage, etc.

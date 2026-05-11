# Developer & AI Agent Guidelines

> **🚨 CRITICAL DIRECTIVE FOR ALL AGENTS 🚨**
> This `AGENTS.md` file acts as the primary memory and source of truth for all architectural, design, and UI decisions in this project. 
> **AGENT BEHAVIOR RULE**: At the end of EVERY task where you make architectural, routing, database, or UI/UX changes, you MUST automatically review and update this file to reflect those changes. You do NOT need the user to explicitly ask you to update `AGENTS.md`; doing it proactively is your responsibility. Do not let this file fall out of sync with the codebase.

This document outlines the core architectural decisions, design patterns, and conventions used in this project to ensure consistency during collaborative development.

## 1. Project Overview
A cloud-based item tracking and inventory management application with QR/NFC scanning capabilities and image-based item identification.

## 2. Tech Stack
- **Frontend**: React 18+ (Vite), TypeScript, Tailwind CSS.
- **PWA**: `vite-plugin-pwa` is used for service worker generation and manifest management. Do not manually create or edit `public/manifest.json` or `public/sw.js`.
- **Backend/Database**: Firebase (Firestore, Authentication, Storage).
- **Icons**: Lucide React.
- **Scanning**: `html5-qrcode` for camera-based QR detection.
- **Client-Side AI**: `@tensorflow/tfjs` and `@mediapipe/tasks-vision` for browser-based object identification.

## 3. Design System & UI Architecture
- **Theme**: Utilizes Material Design 3 (M3) inspired CSS variables (found in `index.css`).
  - Key tokens: `var(--primary)`, `var(--surface-container)`, `var(--on-surface)`.
- **Responsive Design**:
  - Desktop-first design but mobile-optimized code.
  - Interactive elements must support both hover (PC) and tap (Mobile) states.
- **Typography**: Clean sans-serif (Inter) for UI, high-contrast monospace for technical data (IDs, tags).
- **App Layout & Navigation**:
  - The main application flow is built as a unified Single Page Application (SPA) using a state-driven screen toggle approach (e.g., `type Screen = 'dashboard' | 'search' | 'capture' ...`) to maintain state seamlessly without internal URL fragmenting.
  - **Dedicated Routes (Sub-pages)**: Pages like Admin (`/admin`), User Settings (`/settings`), Beta Tests (`/test`), and API Demos (`/demo`) are securely separated using `react-router-dom`. This provides strict access boundaries, dedicated entry points, and prevents the main SPA logic from becoming bloated.
  - **Sticky Top Navigations for Sub-pages**: Dedicated pages use a Sticky Top Navigation header (`sticky top-[57px] z-30 bg-[var(--surface-container-high)]/95 backdrop-blur-xl`) ensuring that critical actions (like "Save" or "Exit" buttons) and tab navigations remain accessible even when the content scrolls vertically.
  - **Exit Button Consistency**: Every sub-page MUST have an exit button to return to the main app flow (`/`). This button should be standardized visually across all pages, using the format `🚪 Exit` (using the door emoji instead of arrows for clear visual affordance and consistency).
  - Primary navigation for regular users is handled by a Sticky Bottom Navigation bar which provides quick access to core functions and is optimized for one-handed use on mobile devices.

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

### Bluetooth Tagging
- **Device Filtering**: To prevent the native OS Bluetooth picker from being cluttered with unnamed/unknown devices, apply a wide alphanumeric `namePrefix` filter (`a-z`, `0-9`) when calling `navigator.bluetooth.requestDevice`.
- **Historical Logging**: To retain a long-term history of Bluetooth tag associations without exceeding document limits, consider migrating from a bounded inline array (`bluetoothTags` on the item document) to a dedicated subcollection (e.g., `items/{itemId}/bluetooth_logs`) if events become frequent.
- **RSSI & Timestamps**: 
  - **Timestamps**: Always record the `timestamp` when a tag is detected or linked.
  - **RSSI (Signal Strength)**: `requestDevice` does not return RSSI natively. To obtain signal strength, the browser must support and execute `device.watchAdvertisements()` to listen for `advertisementreceived` events. Model the `rssi` field as optional to gracefully handle browsers where this remains unsupported.

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
- **Cloud Monitoring Constraints**: When using `@google-cloud/monitoring` to fetch metrics, specific dimension filters like `resource.labels.database_id` (Firestore) or `metric.labels.credential_id` (Gemini API) may be prohibited or unavailable depending on the GCP project's setup. The current implementation fetches **overall project-wide metrics**. UI elements displaying these metrics **MUST explicitly state** that they represent the entire GCP project (e.g., over the last 30 days) and indicate that costs/usage are combined if the project is shared with other apps.
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

## 11. Experimental Sandbox & API Demos

To facilitate testing, experimental feature development, and device capability demonstrations, specific non-production features are separated into dedicated screens.

- **Standalone Routes**: Features like `PipesDemo`, hardware API demonstrations, or library-specific tests are NOT placed inside the main `AdminPanel`. Instead, they are given their own dedicated pages (`/test` for Experimental Sandbox, `/demo` for API Demos, `/library` for Library/AI Demos) and are accessible via the profile menu. This ensures the admin panel remains focused strictly on application management and metrics.
- **Hardware API Demos (`/demo`)**: Contains comprehensive API test benches including:
  - **Bluetooth & Web BLE** (`BluetoothDemo.tsx`)
  - **Network Information & Offline Events** (`NetworkDemo.tsx`)
  - **Battery Status API** (`BatteryDemo.tsx`)
  - **Vibration API** (`VibrationDemo.tsx`)
  - **Device Motion & Orientation** (`MotionDemo.tsx`)
  - **Magnetometer & Geomagnetic APIs** (`MagnetometerDemo.tsx`)
  - **Ambient Light Sensor** (`AmbientLightDemo.tsx`)
  - **Geolocation API** (`GeolocationDemo.tsx`)
  - **Web NFC (NDEF)** (`NfcDemo.tsx`)
  - **CacheStorage API** (`CacheDemo.tsx`)
- **Library & AI Demos (`/library`)**: Demonstrates browser-based capabilities using heavy libraries:
  - **TensorFlow.js (COCO-SSD)**: Real-time object detection using MobileNet V2.
  - **MediaPipe Tasks Vision**: High-performance object detection using EfficientDet-Lite0.
- **Adding New Test Components**:
  - When adding new experimental features or device API tests, add them to the appropriate screen (e.g., `DemoScreen.tsx` for hardware capabilities, `TestScreen.tsx` for UI/UX tests).
  - If a screen requires sub-navigation between different demos, a horizontal tab navigation system (`overflow-x-auto no-scrollbar`) is the standard pattern to select the active view via state.
  - Smooth transitions between sub-tabs should be handled using `<AnimatePresence mode="wait">` and `<motion.div>` from `motion/react`.
  - These sandbox areas may be accessed by any user (not restricted to admins) to test platform compatibility across different user devices.

## 12. Settings & Form State Management

The User Settings area (`/settings`) serves as the centralized hub for account preferences, including **Theme Configuration** (Color and Dark/Light Mode) and **Image Capture Preferences**.

When creating panels or pages where users edit settings (e.g., `UserSettingsPanel.tsx`), enforce the following robust UI/UX data entry patterns:
- **Local State Buffer**: Always store pending user edits in a local state variable that is distinct from the globally active/committed settings (Except for visual themes which apply immediately via Context).
- **Cancel/Exit Capability**: Provide an "Exit" or "Cancel" button to cleanly revert the local buffer back to the committed settings and return to the previous screen.
- **Save Contextual Feedback**: The "Save" button MUST be disabled unless there are actual, unsaved changes detected (e.g., comparing local state vs global state).
- **Auto-Close on Success**: Unless the setting dictates otherwise, configuration screens should automatically close (or navigate back) after successfully persisting changes to the backend or global state.

## 13. PWA & App Status Monitoring

- **Service Worker Generation**: Uses `vite-plugin-pwa` with Workbox for manifest and service worker injection. Do not manually author `public/manifest.json` or `public/sw.js`.
- **Build Failure Avoidance (File Size Limit)**: By default, Workbox's `maximumFileSizeToCacheInBytes` is 2MB. Since React/Vite builds can exceed this in standard chunks (often > 2.5MB depending on imports), this limit has been explicitly increased to 5MB (`5000000` bytes) in `vite.config.ts`. Failing to keep this updated will result in build errors indicating assets won't be precached.
- **Centralized Health Dialog**: The application surfaces real-time system health data via the `AppStatusDialog` (accessed by clicking the App Icon in the top-left header). This is the standard location for presenting:
  - **Firebase Connection Status**: Shows online/offline state of the Firestore connection.
  - **Local Cache Stats**: Exposes Workbox and PWA cache usage by polling the browser's native `caches` API (`getAppCacheSizes` util). This allows users to inspect the footprint of cached assets directly from the UI without dev tools.

## 14. Client-Side AI & Computer Vision

To support real-time object identification on mobile devices (e.g., Pixel 8a) without cloud latency, the application implements browser-based AI inference.

- **Engine Selection**:
  - **TensorFlow.js**: Used for its versatility and large community model zoo.
  - **MediaPipe**: Preferred for production due to superior performance and specialized WASM delegates.
- **WASM Optimization**: Models use XNNPACK-optimized CPU delegates or GPU (WebGL/WebGPU) acceleration where available.
- **Log Management**: Noisy internal library logs (e.g., `INFO: Created TensorFlow Lite XNNPACK delegate for CPU.`) are globally suppressed in library-heavy screens using a centralized console filtering override to maintain clean debug logs.
- **State Management**: Animation frames (`requestAnimationFrame`) are strictly managed and cancelled on component unmount to prevent memory leaks and background CPU usage.

# Developer & AI Agent Guidelines

> **🚨 CRITICAL DIRECTIVE FOR ALL AGENTS 🚨**
> This `AGENTS.md` file acts as the primary memory and source of truth for all architectural, design, and UI decisions in this project. 
> **AGENT BEHAVIOR RULE**: At the end of EVERY task where you make architectural, routing, database, or UI/UX changes, you MUST automatically review and update this file to reflect those changes. You do NOT need the user to explicitly ask you to update `AGENTS.md`; doing it proactively is your responsibility. Do not let this file fall out of sync with the codebase.

This document outlines the core architectural decisions, design patterns, and conventions used in this project to ensure consistency during collaborative development.

## 1. Project Overview
A cloud-based item tracking and inventory management application with QR/NFC scanning capabilities and image-based item identification.

### Project Harness / Final Product Goal
The final objective of this project is to complete and deploy a Firebase-hosted inventory management application. The Entity/Fact/Projection (EFP) migration is the foundational data model for that application.

The purpose of the EFP migration is to support reliable item / marker / place / fact / projection workflows in the eventual user-facing app. Operational validation, canary work, and backfill planning are migration safety mechanisms, not the final product itself. Backfill execution and UI read switching must remain gated by explicit evidence and planning.

All data-model, reconciliation, projection, validation, and backfill work should be evaluated against this final product goal:
* a deployable Firebase application
* a robust inventory / item management data model
* safe migration from legacy data structures
* reliable derived projections for application reads
* controlled operational validation before any broad backfill or UI read switching
* eventual user-facing functionality on top of the EFP model

### Naming & Identification
To prevent confusion across systems, note the following distinct markers/identifiers used in this project:
- **User-Facing Brand**: `scan.moukaeritai.work`
- **Firebase Hosting Target**: `scan-moukaeritai-work`
- **Backend Firebase Resources (Firestore/Storage)**: `photo-moukaeritai-work` (Legacy identifier retained for the datastore)
- **Firebase Project ID**: `moukaeritaid`

## 2. Tech Stack
- **Frontend**: React 19 (Vite), TypeScript, Tailwind CSS.
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
  - **Exit Button Consistency**: Every authenticated sub-page MUST have an exit button to return to the authenticated app home (`/app`) unless intentionally returning to the public landing/logout flow (`/`). This button should be standardized visually across all pages, using the format `🚪 Exit` (using the door emoji instead of arrows for clear visual affordance and consistency).
  - Primary navigation for regular users is handled by a Sticky Bottom Navigation bar which provides quick access to core functions and is optimized for one-handed use on mobile devices.
- **Popups and Menus (Click Outside Pattern)**: As a standard UI pattern, any custom dropdowns, modal menus, or popups (e.g., the profile menu) MUST close when the user clicks or taps outside the element. This should be implemented using React's `useRef` and a `useEffect` hook listening to `mousedown` and `touchstart` events on the `document`, rather than relying on transparent full-screen overlay divs which can suffer from z-index and event-bubbling issues.

## 4. Feature-Specific Implementations

### Image Provisioning (`CaptureForm.tsx`)
- **Image Data Model**:
  - `objectImages` collection is the source of truth for image asset metadata.
  - `objects.primaryImageUrl` is a denormalized UI cache for Dashboard/Search list views.
  - `objects.primaryImageId` points to the primary image record in `objectImages`.
  - Legacy migrated images may only have `downloadUrl` and `legacy.sourceUrl` if the original `storagePath` cannot be recovered.
- **Dual Input Strategy**: Uses separate `<input>` elements for file selection vs. camera capture (`capture="environment"`).
- **Multi-Method Support**: Supports Click-to-dialog, Drag-and-drop, and Camera-direct.
- **Compression & Settings**: WebP is the default format for optimal compression, falling back to JPEG if unsupported. Users can configure format, quality, and resolution in the User Settings panel (`UserSettingsPanel.tsx`) which is saved per-user in Firestore `users/{uid}.settings` (a nested `settings` field inside the `users/{uid}` document).
- **Interaction Model**:
  - PC: Hover triggers action menus.
  - Mobile: Tap toggles action menus (state-managed via `activeImageMenu`).

### QR Scanner (`Scanner.tsx`)
- **Initialization**: Delayed slightly to avoid race conditions with React StrictMode.
- **Viewfinder**: Custom overlay with "Scanning" indicator (pings) and viewfinder focus frame.
- **Layout**: The camera `video` element is forced to `object-cover` via `index.css` to match the UI's rounded-corner cards.

### Bluetooth Tagging
- **Device Filtering**: To prevent the native OS Bluetooth picker from being cluttered with unnamed/unknown devices, apply a wide alphanumeric `namePrefix` filter (`a-z`, `0-9`) when calling `navigator.bluetooth.requestDevice`.
- **Data Model**: Bluetooth identifiers should be modeled through `identifiers` with `kind: "bluetooth"` when a stable device identifier is available.
- **Historical Logging**: Bluetooth-related scans/observations should be represented as `objectEvents` where appropriate to retain a long-term history without exceeding document limits. Legacy `bluetoothTags` may exist only in `LegacyItem` for migration compatibility.
- **RSSI & Timestamps**: 
  - **Timestamps**: Always record the `timestamp` when a tag is detected or linked.
  - **RSSI (Signal Strength)**: `requestDevice` does not return RSSI natively. To obtain signal strength, the browser must support and execute `device.watchAdvertisements()` to listen for `advertisementreceived` events. Note that browser Bluetooth RSSI remains optional because `requestDevice` does not provide RSSI directly and `watchAdvertisements()` is not universally supported.

### Image Interaction & Metadata
- **Format Overlay**: All item images in the Dashboard, Search results, and Capture forms include a small, translucent overlay in the corner indicating the file format (e.g., JPEG, PNG). This is computed via `getImageFormatFromUrl` in `utils.ts`.
- **Long Press Metadata**: Users can long-press (or right-click/press-and-hold) any item image to trigger an `ImageMetadataDialog`. 
  - Implementation: Managed via the `useLongPress` hook and `triggerImageMetadata` event bus.
  - Data: Displays secure Firebase Storage metadata including Content-Type, File Size (formatted), Created At, and the full Storage Path.

## 5. Development Constraints
- **Port**: Always runs on port **3000**.
- **HMR**: Disabled by platform. Rebuilds occur on file save/turn completion.
- **Environment Variables**: Use `.env.example` as a template.
- **Local Validation Dependency Order**:
  - Always install root dependencies (`npm ci` preferred, `npm install` only when lockfile updates are intended) before running root `npm run lint` / `npm run build`.
  - Always install dependencies inside `functions/` (`cd functions && npm ci` preferred) before running `cd functions && npm run build`.
  - Do not classify missing dependency/module errors (for example `vite not found`, `react`, `firebase/*`) as source-code defects until dependency installation is completed in the corresponding directory.

## 6. Firebase Configuration (Database & Storage)
- **Firestore Schema Architecture**:
  - `users/{uid}`: Synchronized from Firebase Auth. Stores user profiles.
  - `admins/{uid}`: Handles Role-Based Access Control (RBAC). The presence of a document grants admin privileges.
  - **Current implementation collections**:
    - `objects/{objectId}`: The core inventory object document.
    - `identifiers/{identifierKey}`: Maps QR/NFC/manual/barcode/Bluetooth identifiers to objects.
    - `objectIdentifierBindings/{bindingId}`: Canonical active relationship state between objects and identifiers (not a historical log).
    - `objectImages/{imageId}`: Records image metadata and Storage references.
    - `objectEvents/{eventId}`: Records append-only operational events (including attachment/detachment history).
    - `items/{itemId}`: Legacy-only and used as migration input.
  - **Target Conceptual Model**: The application is moving toward an Entity / Fact / Projection architecture as defined in `docs/architecture/entity-fact-projection-data-model.md`.
    - Entity collections: `objects`, `markers`, `places` (Do not use `locations`).
    - Fact collections: `associations`, `observations`, `measurements`, `events` (Do not use `bindings`).
    - Projection collections: `objectSummaries`, `markerSummaries`, `placeSummaries`
    - Note: Domain time fields (e.g., `createdAt`, `updatedAt`, `lastSeenAt`) must not be placed directly on new Entity records. They belong in Fact or Summary layers.
  - Current mappings:
    - `identifiers` conceptually maps to `markers`
    - `objectIdentifierBindings` conceptually maps to `associations`
    - `identifierObservations` conceptually maps to `observations`
  - **Runtime migration planning**:
    - The phased runtime migration plan is documented in `docs/migrations/entity-fact-projection-runtime-migration-plan.md`.
    - Agents must consult that plan before changing `Scanner.tsx` or `CaptureForm.tsx` reads/writes from `identifiers` / `objectIdentifierBindings` toward `markers` / `associations` / `observations` / `measurements` / summaries.
- **Legacy Identifiers for Backend Resources**: The frontend deployment target uses the current domain name (`scan-moukaeritai-work`), but backend Firebase resources (Firestore Database, Storage Bucket) intentionally retain the legacy identifier `photo-moukaeritai-work`. This is reflected in `firebase-applet-config.json` and must not be altered to match the hosting name.
- **Cloud Storage Strategy**:
  - Images captured via the application are stored in the designated Firebase Storage bucket (`photo-moukaeritai-work`).
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
- **AI & Gemini Processing**: API keys must be strictly hidden from the frontend. AI generation (matching images, description building) natively happens in Firebase Callable Functions using the `@google/genai` SDK and Firebase Secret Manager (`GEMINI_API_KEY`). Ensure `vite.config.ts` does not unnecessarily expose the key to the client build context.
- **CI/CD**: Firebase Functions deployment is handled automatically via a GitHub Actions workflow (`.github/workflows/deploy-functions.yml`) upon pushes to `scan.moukaeritai.work`.
- **Deployment Strategy**: We intentionally retain older functions. Therefore, deployments should perform differential updates without forcefully deleting functions that exist in the cloud but are missing from the local source code.
- **Incremental Deployment (GitHub Actions)**: To avoid errors such as `'The following functions are found in your project but do not exist in your local source code... Aborting because deletion cannot proceed in non-interactive mode'`, the deployment command in `.github/workflows/deploy-functions.yml` MUST specify individual functions explicitly using `--only "functions:funcA,functions:funcB"`. This circumvents the interactive deletion prompt for outdated deployed functions.
- **Workflow Synchronization (CRITICAL)**: Whenever you add, rename, or remove a Cloud Function in `/functions/src/index.ts`, you MUST simultaneously update the `--only` flag in `.github/workflows/deploy-functions.yml` to reflect the exact list of functions. Failure to do so will result in deployment mismatches and missing functions.

## 9. Communication & Logs
- Do not commit transient PR-helper, review-reply, scratch, or tool-failure files such as `patch_pr.js`, `reply_payload.json`, one-off local scripts, temporary JSON payloads, generated reply bodies, or similar agent-control artifacts. If such files are needed locally by an agent, they must remain untracked.
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

- **Standalone Routes**: Features like `PipesDemo`, hardware API demonstrations, or library-specific tests are NOT placed inside the main `AdminPanel`. Instead, they are given their own dedicated pages (`/test` for Experimental Sandbox, `/demo` for API Demos, `/library-demo` for Library/AI Demos) and are accessible via the profile menu. This ensures the admin panel remains focused strictly on application management and metrics.
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
- **Library & AI Demos (`/library-demo`)**: Demonstrates browser-based capabilities using heavy libraries:
  - **TensorFlow.js (COCO-SSD)**: Real-time object detection using MobileNet V2.
  - **MediaPipe Tasks Vision**: High-performance object detection using EfficientDet-Lite0.
- **Adding New Test Components**:
  - When adding new experimental features or device API tests, add them to the appropriate screen (e.g., `DemoScreen.tsx` for hardware capabilities, `TestScreen.tsx` for UI/UX tests).
  - If a screen requires sub-navigation between different demos, a horizontal tab navigation system (`overflow-x-auto no-scrollbar`) is the standard pattern to select the active view via state.
  - Smooth transitions between sub-tabs should be handled using `<AnimatePresence mode="wait">` and `<motion.div>` from `motion/react`.
  - These sandbox areas may be accessed by any user (not restricted to admins) to test platform compatibility across different user devices.

## 12. Routing & Sitemap Documentation

To maintain clarity for administrators and developers, the application includes a built-in, human-readable route map.
- The human-readable admin route map lives at `/admin/sitemap`.
- It is for administrators/developers, not SEO (it is not a sitemap.xml).
- Whenever routes are added, renamed, or removed in the application, you MUST update `src/lib/routeCatalog.ts` (and by extension `SitemapPage.tsx`).
- Key routes include:
  - `/`: Public landing/login route. Authenticated users are not automatically redirected; they enter the app explicitly from the landing page via an app-entry button.
  - `/app`: Authenticated app home.
  - `/object/new`: Create object.
  - `/object/:id`: View/edit object.
  - `/item/:id`: Protected legacy redirect to `/object/:id`, implemented under the authenticated app routing shell.
  - `/unassigned`: Handle scanned tags not yet bound.
  - `/admin/migration`: Retired legacy database migration tool (displays deprecation warning).
  - `/admin/sitemap`: The human-readable route map itself.
- Keep the route map strictly synchronized with `App.tsx`.
- The `/admin/sitemap` route is admin-only and should never appear in the bottom navigation.

## 13. Settings & Form State Management

The User Settings area (`/settings`) serves as the centralized hub for account preferences, including **Theme Configuration** (Color and Dark/Light Mode) and **Image Capture Preferences**.
- **Data Storage**: User settings (such as image format, compression quality, and max resolution) are stored directly inside the `users/{uid}` document under the `settings` field as a nested object.

When creating panels or pages where users edit settings (e.g., `UserSettingsPanel.tsx`), enforce the following robust UI/UX data entry patterns:
- **Local State Buffer**: Always store pending user edits in a local state variable that is distinct from the globally active/committed settings (Except for visual themes which apply immediately via Context).
- **Cancel/Exit Capability**: Provide an "Exit" or "Cancel" button to cleanly revert the local buffer back to the committed settings and return to the previous screen.
- **Save Contextual Feedback**: The "Save" button MUST be disabled unless there are actual, unsaved changes detected (e.g., comparing local state vs global state).
- **Auto-Close on Success**: Unless the setting dictates otherwise, configuration screens should automatically close (or navigate back) after successfully persisting changes to the backend or global state.

## 14. PWA & App Status Monitoring

- **Service Worker Generation**: Uses `vite-plugin-pwa` with Workbox for manifest and service worker injection. Do not manually author `public/manifest.json` or `public/sw.js`.
- **Build Failure Avoidance (File Size Limit)**: By default, Workbox's `maximumFileSizeToCacheInBytes` is 2MB. Since React/Vite builds can exceed this in standard chunks (often > 2.5MB depending on imports), this limit has been explicitly increased to 6MB (`6000000` bytes) in `vite.config.ts`. Failing to keep this updated will result in build errors indicating assets won't be precached.
- **PWA Landing Offline Fallback**: The PWA uses Workbox `navigateFallback: '/index.html'` and precaches the generated app shell so `/` remains available offline after installation without adding runtime caching for Firestore data or dynamic inventory content.
- **PWA Icon Assets**: The source app icon is `public/icon.svg`; SVG icon assets live in `public/favicon.svg`, `public/apple-touch-icon.svg`, `public/pwa-icon-192.svg`, `public/pwa-icon-512.svg`, and `public/maskable-icon.svg`. PNG fallback assets (`public/favicon-48.png`, `public/apple-touch-icon.png`, `public/pwa-icon-192.png`, `public/pwa-icon-512.png`, `public/maskable-icon-512.png`) are generated by `npm run build` via `scripts/generate-pwa-icons.mjs` for iOS, Android launcher, and maskable install compatibility; do not commit the generated PNG files. Update `vite.config.ts` manifest declarations and `index.html` links together when changing these files.
- **Centralized Health Dialog**: The application surfaces real-time system health data via the `AppStatusDialog` from the public landing page (`/`) App Status action. The authenticated app header no longer opens this dialog; tapping the app icon/name in that header returns to the landing page.
  - **Firebase Connection Status**: Shows online/offline state of the Firestore connection.
  - **Local Cache Stats**: Exposes Workbox and PWA cache usage by polling the browser's native `caches` API (`getAppCacheSizes` util). This allows users to inspect the footprint of cached assets directly from the UI without dev tools.

## 15. Client-Side AI & Computer Vision

To support real-time object identification on mobile devices (e.g., Pixel 8a) without cloud latency, the application implements browser-based AI inference.

- **Engine Selection**:
  - **TensorFlow.js**: Used for its versatility and large community model zoo.
  - **MediaPipe**: Preferred for production due to superior performance and specialized WASM delegates.
- **WASM Optimization**: Models use XNNPACK-optimized CPU delegates or GPU (WebGL/WebGPU) acceleration where available.
- **Log Management**: Noisy internal library logs (e.g., `INFO: Created TensorFlow Lite XNNPACK delegate for CPU.`) are globally suppressed in library-heavy screens using a centralized console filtering override to maintain clean debug logs.
- **State Management**: Animation frames (`requestAnimationFrame`) are strictly managed and cancelled on component unmount to prevent memory leaks and background CPU usage.

## 16. Identifiers & QR Code Alphanumeric Mode

To support the creation of small, efficient QR codes, the system utilizes QR Code Alphanumeric mode. QR/NFC payloads should link to inventory objects through identifier tokens and the `identifiers/{identifierKey}` lookup table. Since alphanumeric mode only supports uppercase letters (and numbers/symbols), URLs encoded this way will be entirely uppercase (e.g., `HTTPS://APP.DOMAIN/ITEM/ITEM-123`).

- **Terminology Distinctions**:
  - `objectId`: ID of the real-world object document.
  - `identifierKey`: Firestore-safe key for an identifier document.
  - `canonicalValue`: Normalized scanned value/token.
  - Legacy `itemId`: Old collection document ID used only for migration/backward compatibility.
- **Case Insensitivity & Normalization**: Firestore document IDs are inherently case-sensitive. Therefore, to ensure that scanned alphanumeric URLs correctly map to existing identifiers, **QR tokens and identifier lookup values must be normalized and treated as uppercase**.
- **Lookup Process**: QR/NFC scanning should resolve through `identifiers/{identifierKey}` rather than assuming the scanned payload is a direct `objectId`. The application extracts the payload from a URL (if necessary), normalizes it, and queries the `identifiers` collection.
- **Routing**: Legacy `/item/:id` URLs redirect to `/object/:id` via `RouteCatalog`, but new design should prefer identifier lookup.
- **Generation**: Newly generated `objectId`s and normalized identifier tokens MUST always be exclusively uppercase (e.g., `OBJECT-XYZ123`).

## 17. Migration completeness rule

For any data migration, schema change, normalization, import, backfill, or storage reorganization, agents must require a source coverage audit and source-to-target mapping audit before implementation or execution.

The audit must inspect:
- source schema definitions
- code that wrote the source data
- field paths actually present in real source data

Every source field must be classified as one of:
- `migrated`
- `partially-migrated`
- `derived-only`
- `preserved-as-legacy-reference`
- `preserved-as-raw-snapshot`
- `intentionally-discarded`
- `unmigrated-gap`
- `needs-decision`

Agents must not proceed to execution if any source field is unclassified, `needs-decision`, or `unmigrated-gap`. Fields not migrated must be documented with explicit rationale. Silent data loss is not acceptable. Reference `docs/migrations/migration-design-checklist.md`.

## 18. Data Model Redesign (Objects & Markers)

The application has transitioned from a simple `items` collection to a normalized data model separating physical objects from their identifiers.

- **Data Model Core Principles**:
  - **`objects`**: Represents a real-world physical entity. (Replaces legacy `items`).
    - `objects.identifierSummary` is denormalized and should be recomputed from active identifiers when needed.
    - When adding, repairing, or detaching identifiers (e.g., in `CaptureForm`), the summary should be recomputed from the current Firestore identifier state where practical, not only from potentially stale local component state. Use `loadObjectIdentifiersForSummary()` to fetch the source data, and keep local component state updated after a successful write.
    - `objects.primaryImageUrl` is denormalized and should be kept in sync with the primary `objectImages` record.
  - **`identifiers`**: Legacy/current implementation collection. Represents a physical tag (QR, NFC) or a logical code (barcode, manual). Conceptually maps to the target Marker entity. One object can have zero or more identifiers. One identifier can have at most one active object.
  - **`objectIdentifierBindings`**: Stores canonical relationship state between objects and identifiers. Conceptually maps to `associations` (do not create a new `bindings` collection). Active binding records use deterministic IDs formatted as `${objectId}__${identifierKey}__active`. There must be at most one active binding for a given `(objectId, identifierKey)` pair. Repeated attach of the same identifier to the same object should be idempotent. Reassignment to another object must be explicit and must record events. *Note: Client code should not rely on direct missing-document reads (`getDoc()`) for `objectIdentifierBindings` without checking rules, instead use owner-scoped queries.* **Important:** `objectIdentifierBindings` is NOT a historical log table. The existence of an identifier document does not imply the existence of a binding document.
  - **Document ID Conventions**:
    - `objects/{objectId}`: Field `objectId` must equal the document ID.
    - `identifiers/{identifierKey}`: Field `identifierKey` must equal the document ID. Conceptually maps to `markers`.
    - `objectIdentifierBindings/{bindingId}`: Field `bindingId` must equal the document ID. Canonical active binding IDs are deterministic: `${objectId}__${identifierKey}__active`.
    - `objectEvents/{eventId}`: Field `eventId` must equal the document ID. Normal client-created events may use `uuidv4()`. Migration events may use deterministic IDs such as `${objectId}-migrated`.
    - `objectImages/{imageId}`: Field `imageId` must equal the document ID. Normal uploaded images may use `uuidv4()`. Migration images may use deterministic IDs such as `${objectId}-primary` and `${objectId}-context-${idx}`.
    - `admins/{uid}`: Uses Firebase Auth UID as the document ID.
  - **`objectImages`**: The normalized image metadata collection, replacing embedded arrays of URLs.
  - **`objectEvents`**: The append-only operational history/audit log for object lifecycle, scans, image operations, identifier attach/detach/replacement, migration, and other user/system actions. Relationship history must be recorded in `objectEvents`, not by accumulating active binding rows.

- **Identifier Management**:
  - `validationResult.isIdempotent` only means the `identifiers` lookup already points to the target object. Even in an idempotent attach, the code must proceed to repair canonical binding state and recompute `objects.identifierSummary` (avoiding stale local state). Idempotent attach must not create duplicate `identifier_attached` events. Canonical binding repair should use owner-scoped queries and deterministic active binding IDs.
  - `CaptureForm` is now responsible for active identifier management (Adding and Detaching).
  - Adding an identifier creates/updates canonical bindings and appends to the `objectEvents` history.
  - `CaptureForm` operations must use single `writeBatch` writes to avoid partial states, grouping identifier updates, binding creation, event creation, and object summary updates.
  - Binding existence must be checked via owner-scoped queries (e.g. `findCanonicalBindingsForOwner` and `findActiveBindingsForOwner`) rather than direct document fetching to bypass Firestore rules limitations.
  - Detaching an identifier sets its status to `unassigned`, updates matching active bindings to `detached`, updates `objects.identifierSummary`, and writes the `identifier_detached` event in a single Firestore `writeBatch` for atomicity.
  - Direct NFC attachment is scanner-driven, handled outside of `CaptureForm`. Users should be directed to the scanner flow for NFC identifiers.
- **Legacy Migration**:
  - A dedicated admin-only Cloud Function (`migrateInventoryModel`) safely translated legacy `items` into the normalized collections: `objects`, `identifiers`, `objectIdentifierBindings`, `objectImages`, and `objectEvents`. **Note: This function is now retired and must not be extended. The old items finalization is a small, bounded cleanup, entirely separate from Phase 7E. Phase 7E remains blocked.**
  - Missing `currentLocation` is represented by field absence, not by `null`.
  - The UI formerly provided a `/admin/migration` page to run a Dry Run and an Execute phase. **Note: This UI is retired in Phase 0 and now displays a deprecation message.**
  - **Non-destructive**: Migration does not delete legacy items or Storage files. Legacy `items` are kept intact. If the app tries to load a legacy item that isn't migrated, the user is warned to run the migration first.
  - **Idempotency**: Migration should be idempotent per target record, allowing safe re-runs.
  - Dry-run stats include object update backfills (`objectsUpdated`) when an existing object is patched with missing `primaryImageId`/`primaryImageUrl`.
  - **ID Conversion**: Legacy item IDs are normalized to uppercase object IDs. Legacy source IDs are retained in `objects.legacy.legacyItemId`.
- **Observation Model Migration**:
  - The repository is currently in a staged migration project from the completed `tag-1.0.0` normalized inventory source baseline to an observation-aware model.
  - `tag-1.0.0` is the immutable migration source baseline.
  - `scan.moukaeritai.work` is the working branch and may include preparation commits after the baseline.
  - The previous legacy `items` migration is completed. Do not extend the old legacy migration UI/function for new work.
  - Latest completed phase is Phase 7D.10 (Firestore Rules Stage 1 additive fields); Phase 7E execution remains blocked. (Proceeding on the `1.7.x` version line)
  - Phase 6A imported observation dry-run document is `docs/migrations/phase-6a-imported-observation-dry-run.md`.
  - Phase 6B imported observation execute plan document is `docs/migrations/phase-6b-imported-observation-execute-plan.md`.
  - Phase 7A backend imported observation revalidation dry-run document is `docs/migrations/phase-7a-backend-imported-observation-revalidation-dry-run.md`.
  - Phase 7B limited imported observation execute document is `docs/migrations/phase-7b-limited-imported-observation-execute.md`.
  - Phase 7C controlled execution readiness runbook document is `docs/migrations/phase-7c-controlled-execution-runbook.md`.
  - Phase 7D GitHub Actions controlled dry-run preparation document is `docs/migrations/phase-7d-github-actions-controlled-dry-run.md`.
  - Phase 7D.1 legacy items field coverage audit document is `docs/migrations/phase-7d1-legacy-items-field-coverage-audit.md`.
  - Phase 7D.2 observable identifier / signal observation model design document is `docs/migrations/phase-7d2-observable-identifier-signal-observation-model.md`.
  - Phase 7D.3 Bluetooth legacy migration dry-run design document is `docs/migrations/phase-7d3-bluetooth-legacy-migration-dry-run-design.md`.
  - Phase 7D.3 is design-only. Agents must not implement Bluetooth migration yet, write to Firestore, or deploy. Agents must not add UI execution controls or change runtime schema/rules in this phase. Phase 7E remains blocked.
  - Phase 7B permits backend limited execute mode with small batch sizes only. There is no web migration screen execute UI or AdminPanel UI for execution. Do not broaden Firestore rules for clients. Do not create migrationRuns collections or update identifiers/objects/bindings/events.
  - The authoritative migration plan is: `docs/migrations/observation-model-migration.md`
  - `docs/architecture/deterministic-uuid.md` is the authoritative deterministic UUID namespace document.
  - `src/lib/deterministicUuid.ts` may contain the constant but must point to the permanent document.
  - Cloud Functions must use app-prefixed names. GitHub Actions must not use broad functions deploy. New functions must be deployed by explicit function name if deployment workflow is updated.
  - Agents must not create imported/synthetic observations.
  - Agents must not add execute/apply/repair controls.
  - Agents must not broaden Firestore rules for client-created imported observations.
  - Future execution must use backend/Admin SDK authorization, not ordinary client Firestore writes.
  - Observation-only runtime writes must continue to use `src/lib/identifierObservations.ts`.
  - Phase 7D is GitHub Actions dry-run preparation only and does not execute migration writes.
  - Agents must not execute the `scanExecuteImportedObservationBatch` callable function.
  - Agents must not invoke execute mode for imported observation migration in Phase 7D.
  - Agents must not deploy for Phase 7D dry-run preparation tasks.
  - Agents must not add AdminPanel or web migration execute/apply/repair controls.
  - Agents must not broaden Firestore rules for imported observations.
  - Final controlled imported observation execution is reserved for Phase 7E with separate explicit approval.
  - Agents must not modify execution behavior unless explicitly instructed for a later phase.

- **Source of Truth**:
  - `firebase-blueprint.json` defines the new schema boundaries.
  - Always prefer resolving an identifier via the `identifiers` collection rather than blindly treating a scanned payload as an `objectId`.

### Deployment and Operations

- **Firebase Functions Safety**:
  - The Firebase project is shared with other applications.
  - Never use broad `firebase deploy --only functions` from this repository.
  - Functions deployments must use an explicit allowlist of repository-owned function names (see `docs/deployment/firebase-functions-deploy-safety.md`).
  - Do not rename callable Functions without a staged migration plan.
  - Do not delete remote Functions unless the deletion is explicitly requested and the function is confirmed to be owned by this repository.

### Entity / Fact / Projection Model Polish (2026-06-11)

- Before adding runtime dual-write, agents must verify builder-generated target documents against Firestore rules tests.
- Scanner observation dual-write must pass actorUid so userIds-based rules can authorize the write.
- Under current rules, target Facts that include objectIds/markerKeys/placeIds require the corresponding target Entity documents to exist and be owned by the current user.
- Runtime reads must remain on legacy/current collections until the explicit read-switching phase.

- Any target collection rules change must run `npm run test:rules`.
- Target Fact rules should be append-only for normal users.
- Target Fact access should be owner/participant scoped through userIds and/or legacy.ownerId compatibility fields.
- Target Projection summaries are admin-written derived read models, not client-owned source-of-truth documents.
- Runtime dual-write must not be introduced until rules hardening and tests are complete.

- Target collection rules/indexes/blueprint entries may be prepared before runtime dual-write.
- Rules must remain conservative and owner/participant scoped.
- Projection summaries are derived read models; do not treat them as client-owned source-of-truth documents. They must not be written by ordinary client runtime.
- Projection reconstruction must follow `docs/migrations/projection-reconstruction-semantics.md`.
- Backend/admin code may later call these reducers to write summaries.
- Ordinary client runtime must not write projection summaries.
- Read switching to summaries must be separately feature-gated and must not happen before projection validation/reconciliation is fully complete.
- Runtime components must not call target write-builder helpers until the migration phase explicitly allows dual-write.
- Phase 1 write-builder helpers live in `src/lib/entityFactProjectionWrites.ts`.
- These helpers are pure payload builders and must not perform Firestore writes directly.
- Runtime components must not call the write-builder helpers for dual-write behavior until the migration plan phase explicitly allows it.

- Documentation and explanation pages should present Entity / Fact / Projection as the primary model.
- Legacy runtime names such as identifiers, objectIdentifierBindings, and locations should be described as current implementation compatibility layers, not as the long-term conceptual model.
- Legacy terminology maps as follows:
  - `Identifier` conceptually maps to `Marker`.
  - `Binding` conceptually maps to `Association`.
  - `locations` conceptually maps to `Place`.
- When updating developer documentation, explicitly state that `Identifier`, `Binding`, and `locations` are legacy/current implementation terms, and `Marker`, `Association`, and `places` should be preferred for conceptual discussions.
- Domain time conceptually belongs to Facts, and should not be placed on Entity types directly.
- Do not remove legacy terms from docs while the runtime still uses them; instead, map them to Marker, Association, and Place.
- The Entity / Fact / Projection Runtime Migration Plan is documented at `docs/migrations/entity-fact-projection-runtime-migration-plan.md`. This plan outlines the phased approach to transition from the legacy Identifier/Binding model to the Entity/Fact/Projection model.
  - **Phase 2 Scanner Observation Dual-Write Guardrails:**
    - Scanner observation dual-write must remain feature-gated via `VITE_ENABLE_SCANNER_OBSERVATION_DUAL_WRITE`.
    - Scanner read switching is strictly prohibited during the observation dual-write phase.
    - Target observation failures must be non-blocking and must not break legacy scan resolution or `objectEvents` writes.
    - Runtime contract closure is not a rollout approval. The next gate is the Scanner Observation Dual-Write Rollout Design Gate.
    - Feature flag enablement remains separate and explicit.
  - **Phase 3 CaptureForm Marker/Association Dual-Write Guardrails:**
    - CaptureForm marker/association dual-write must remain feature-gated by `VITE_ENABLE_CAPTURE_MARKER_ASSOCIATION_DUAL_WRITE`.
    - CaptureForm reads must remain on legacy `identifiers`/`objectIdentifierBindings` until read-switching phase.
    - Target marker/association failures must not break legacy save or attach flows.
    - Target association detach must be represented append-only.
    - Do not update existing active Association Facts from client runtime code.
    - Use explicit `object_has_marker` transition builders (`buildObjectHasMarkerDetachedAssociationWrite` and `buildObjectHasMarkerActiveTransitionAssociationWrite`) for detached and reattached Association Facts.
    - Do not reuse the initial active association ID for detach or reattach transitions.
    - CaptureForm target association transition shadow-write must remain feature-gated by `VITE_ENABLE_CAPTURE_ASSOCIATION_TRANSITION_DUAL_WRITE`.
    - Detach and reattach runtime writes must create new transition Association Facts.
    - Client runtime must not update existing Association Facts to express relationship state transitions.
  - **Phase 4 CaptureForm currentLocation Measurement Dual-Write Guardrails:**
    - CaptureForm currentLocation measurement dual-write must remain feature-gated.
    - Do not stop writing `objects.currentLocation` until read switching and summary migration are explicitly planned.
    - Do not write `objectSummaries` from ordinary clients.
    - Target measurement failures must not break legacy save/update flows.
- Added `FactProvenanceSource` union to restrict `FactProvenance.source` values (`user_confirmed`, `user_report`, `marker_observation`, `location_measurement`, `trusted_reader`, `system_inference`, `admin_import`, `migration`, `import`, `legacy_observation`, `legacy_event`, `legacy_mapping`).
- Added new `FactProvenance` metadata fields (`actorUid`, `sourceFactIds`).
- `ownerId` policy in Entity docs (Object, Marker, Place): In the conceptual model, `ownerId` is not part of entity identity. However, in the current implementation, it remains required by Firestore rules and owner-scoped runtime paths. Migration direction is to keep `ownerId` for compatibility now and not include it in semantic identity.
- NFC `nativeId` conservative mapping policy: `felica-idm` maps to `nativeId.kind = 'felica_idm'`. `nfc-uid` remains `nativeId.kind = 'unknown'` unless the legacy scheme clearly distinguishes ISO14443/ISO15693. Raw scheme/canonical values are preserved under legacy mapping.

### Phase 7D.8 database schema / runtime update (2026-05-30)
- Additive v2 fields (`rawPayload`, `identityModelVersion`, `identitySchemaVersion`, `canonicalizationVersion`) were added to `IdentifierRecord` runtime and blueprint.
- `ownerId` remains required for now. `rawValue` remains for compatibility.
- Pure semantic identifier identity helpers were added (`src/lib/identifierIdentity.ts`).
- Vitest was added for pure unit testing.
- Firestore rules, data migrations, and runtime writes were strictly left unmodified.

### Phase 7D.5 documentation decisions (2026-05-28)
- Canonical identifier registry remains `identifiers/{identifierKey}` (no `globalIdentifiers`).
- Canonical identifier UUIDv5 payload omits `idPurpose`; `idKind = "identifier"` is sufficient.
- `identityModelVersion` is runtime interpretation metadata (missing/1 legacy compatibility, 2 ownerless/global) and is excluded from UUIDv5 payload.
- `scheme` remains part of semantic identifier identity with `kind` + `canonicalValue`.
- Future v2 design uses optional non-identifying `rawPayload` instead of `rawValue` in design docs.
- `IdentifierRecord.objectId` is legacy/non-authoritative compatibility only; canonical relation remains `objectIdentifierBindings`.
- ACL fields and `identifierClaims` are future-only; do not introduce in current phases.
- Bluetooth remains under unified identifier model via `kind: "bluetooth"` and scheme-specific canonicalization.

## Developer Documentation Constraints
- Developer documentation is public under `/developer`.
- The developer docs section has its own internal navigation layout.
- The route `/developer/data-model-graph` provides a static `sigma.js` visualization of the data model.
- The data model graph MUST NOT connect to Firestore or inspect live data.
- Do not bypass these constraints to make developer documentation routes dynamic or read from the database.
- Route catalog must stay synchronized with developer routes in `src/lib/routeCatalog.ts`.
- When making architectural, routing, database, or UI/UX changes, the public developer documentation pages (`src/components/developerDocs/`) and route catalog (`src/lib/routeCatalog.ts`) MUST be reviewed and updated to reflect those changes.

## Entity/Fact/Projection Guardrails
- Projection recompute must remain backend/admin-only.
- Single-target recompute is a foundation; do not add broad backfill or read switching without a separate plan.
- The canonical pure EFP model/types/reducers/utilities live in `packages/efp-model`.
- Root EFP files under `src/lib` and `src/types` are compatibility re-export shims unless explicitly migrated.
- The package must remain free of Firebase client SDK, Firebase Admin SDK, Firebase Functions, React, and Vite imports.
- functions/src/** must not import source files outside functions/.
- functions/src/** must not import ../../src/** or ../../packages/**.
- @scan/efp-model source imports from functions/src are prohibited until the package is included as a proper functions deployment dependency.
- recomputeProjectionSummary may exist only as a disabled stub until Functions package-consumption validation is complete.
- CI and Functions deploy workflows must run the Functions import-boundary validation before build/deploy.
- Do not bypass `test:functions-boundary` to ship Functions code.
- If the boundary check fails, fix the import boundary rather than adding ad hoc exceptions.
- @scan/efp-model must remain consumable by both ESM import and CommonJS require unless Functions are explicitly migrated away from CommonJS.
- Package artifact smoke tests must pass before any Functions code consumes @scan/efp-model.
- Do not make Functions import @scan/efp-model until it is included in the functions deployment artifact as a proper dependency.
- @scan/efp-model must be prepared into functions/vendor/efp-model before installing or building Functions dependencies.
- Functions code must consume shared EFP logic only through the declared @scan/efp-model dependency.
- Functions code must never import ../../packages/** or ../../src/**.
- The generated functions/vendor directory must not be committed.
- recomputeProjectionSummary is single-target only and dry-run by default.
- Do not expand recomputeProjectionSummary into broad backfill or read switching without a separate plan.
- Functions recompute code must import shared reducers from @scan/efp-model only.
- Do not import ../../packages/** or ../../src/** from functions/src.
- Projection recompute input parsing must remain dependency-free and covered by ordinary unit tests.
- Projection recompute Fact query planning must remain dependency-free and covered by ordinary unit tests.
- Projection recompute operational validation must start with dryRun=true on selected targets.
- EFP drift audit artifacts are documentation/local-validation only. Passing drift audit validation does not authorize runtime migration, backfill, projection recompute behavior changes, Firestore rule changes, or UI read switching.
- EFP drift closure plan artifacts are planning/local-validation only. Passing closure plan validation does not authorize runtime migration, Firestore rules changes, index changes, backfill, projection recompute behavior changes, or UI read switching. Rules hardening and read switching require separate explicit PRs.
- Do not remove, rename, or reinterpret legacy compatibility fields solely because they are listed as drift; each drift closure requires a separate explicit migration/read-switching plan.
- Single-target reconciliation is available (`reconcileProjectionSummary`). It is admin-only, read-only, and does not replace broad backfill or authorize UI read switching by itself. Broad backfill and UI read switching remain future work.
- Selected-target batch reconciliation is available (`reconcileProjectionSummaries`). It is admin-only and read-only. It does not scan collections and has hard target-count limits. It does not replace broad backfill and does not authorize UI read switching. `includeSummaries` should be used sparingly because callable responses can become large.
- Selected-target reconciliation responses can be saved to JSON and summarized locally using `ops:report-projection-reconciliation`. The report tool is local-only, does not call Firebase, and its `pass`/`attention`/`fail` status is an operational validation aid that does not authorize UI read switching or replace broad backfill.
- Local canary write plans can be generated from saved responses/reports using `ops:plan-projection-canary-writes`. It does not call Firebase, does not perform writes, and generates `dryRun:false` payloads for explicit manual canary use only. It does not authorize broad backfill or UI read switching, and the maximum canary target count is strictly 5.
- Saved canary evidence can be validated locally using `ops:validate-projection-canary-writes`. It consumes a saved canary plan and saved post-write reconciliation response/report. It does not call Firebase and does not perform writes. Passing canary validation does not authorize broad backfill or UI read switching.
- Saved local evidence can be assessed for readiness to design backfill using `ops:assess-projection-backfill-readiness`. It produces a conservative `ready-for-backfill-design` or `blocked`/`fail` assessment without calling Firebase, performing writes, or performing backfill. `ready-for-backfill-design` does not authorize backfill execution or UI read switching.
- Projection backfill planning can be generated using `ops:plan-projection-backfill`. It is a local-only tool that consumes readiness assessment and explicit target lists. It does not call Firebase, perform writes, or execute backfill. Its default mode is `dryRun`, and even `manual-write-plan` mode only emits payloads and does not execute them. No UI read switching is authorized by generating a plan.
- A local operation packet can be prepared using `ops:prepare-projection-backfill-operation`. It consumes readiness evidence and explicit targets or a backfill plan. It does not call Firebase, perform writes, execute backfill, or authorize UI read switching.
- Saved operation packet evidence can be validated locally using `ops:validate-projection-backfill-operation`. It consumes an operation packet and saved artifact manifest. It does not call Firebase, perform writes, execute backfill, or authorize UI read switching. Passing evidence validation (`dry-run-evidence-pass` or `manual-write-evidence-pass`) does not authorize actual backfill execution or UI read switching. Actual backfill execution design, rollback policy, and UI read switching gate remain future work.
- `ops:assess-projection-backfill-execution-design` evaluates saved validation bundles for readiness to begin execution design. It is local-only, does not call Firebase, does not write, does not execute backfill, and does not authorize UI read switching. `ready-for-execution-design` is not execution approval.
- The `projection-backfill-design-gate` GitHub Actions workflow automates the local-only execution design gate assessment. It explicitly forbids Firebase credentials, OIDC, network writes, or runtime deployments, operating as a self-contained chain workflow to generate and validate evidence dynamically.
- Do not add broad backfill, scheduled recompute, or read switching in the operational validation stride.
- dryRun=false validation must be single-target and explicitly requested.
- The Controlled Projection Backfill Execution Design Packet evaluates the execution design gate and strictly enforces safety invariants (`executionAuthorization: false`, `written: false`, `executed: false`). It produces the highest positive status `ready-for-controlled-execution-design-review`, which is not execution approval and must never authorize broad backfill or UI read switching.
- The Controlled Execution Review Contract generates a formalized checklist, risk register, and approval boundary local-only artifact. It enforces identical invariants and is explicitly *not* execution approval.
- Scanner observation dual-write readiness artifacts are planning/local-validation only.
- Scanner observation dual-write runtime contract evidence is strictly local-only proof of alignment. Passing validation does not authorize feature flag enablement, runtime rollout, or UI read switching.
- Scanner observation target rules hardening design artifacts are planning/local-validation only. Passing target rules hardening design validation does not modify Firestore rules, deploy rules, enable the feature flag, authorize runtime dual-write rollout, or authorize UI read switching. Actual Firestore rules changes require a separate explicit PR.
- Passing readiness validation does not enable the feature flag and does not authorize rollout, backfill, or UI read switching.
- The scanner legacy identifier lookup and objectEvents write remain authoritative until a separate explicit migration/read-switching PR.
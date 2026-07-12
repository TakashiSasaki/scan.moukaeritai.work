import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const appEntryPath = path.join(rootDir, 'src', 'App.tsx');
const appEntryContent = fs.readFileSync(appEntryPath, 'utf8');

let errors = [];

// App entry doesn't import Dashboard, CaptureForm, UnassignedIdentifierScreen, SearchScreen
const forbiddenImports = ['Dashboard', 'CaptureForm', 'UnassignedIdentifierScreen', 'SearchScreen'];
for (const forbidden of forbiddenImports) {
  const staticRegex = new RegExp(`import\\s+.*?\\b${forbidden}\\b.*?from`, 'i');
  const lazyRegex = new RegExp(`import\\s*\\(\\s*['"].*?\\b${forbidden}\\b.*?['"]\\s*\\)`, 'i');
  if (staticRegex.test(appEntryContent) || lazyRegex.test(appEntryContent)) {
    errors.push(`App.tsx must not import ${forbidden}. It should be outside active routes.`);
  }
}

// /admin, /admin/sitemap, /developer/* must use AdminRoute
if (!appEntryContent.includes('<AdminRoute>')) {
    errors.push(`App.tsx must use AdminRoute for admin paths.`);
}

// Check for explicit role assignment using specific email
const authContextPath = path.join(rootDir, 'src', 'auth', 'AuthContext.tsx');
if (fs.existsSync(authContextPath)) {
  const authContextContent = fs.readFileSync(authContextPath, 'utf8');
  if (authContextContent.match(/email\s*===?\s*['"].*@.*['"]/i)) {
    errors.push(`AuthContext must not use specific email addresses for role validation.`);
  }
}

// Write to identifiers/objectIdentifierBindings from active entry
if (appEntryContent.includes('objectIdentifierBindings') || appEntryContent.includes('identifiers')) {
    errors.push(`App.tsx must not reference legacy write targets like identifiers or objectIdentifierBindings.`);
}

if (errors.length > 0) {
  console.error("Routing boundary validation failed:");
  errors.forEach(err => console.error(" - " + err));
  process.exit(1);
} else {
  console.log("Routing boundary validation passed.");
}

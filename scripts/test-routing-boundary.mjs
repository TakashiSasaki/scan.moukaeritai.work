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

// Ensure specific paths use expected guards
const expectedGuards = {
  '/admin': 'AdminRoute',
  '/admin/sitemap': 'AdminRoute',
  '/developer/*': 'AdminRoute',
  '/demo': 'AdminRoute',
  '/library-demo': 'AdminRoute',
  '/test': 'AdminRoute',
  '/app': 'ProtectedRoute',
  '/settings': 'ProtectedRoute',
};

// Use a regex to extract each <Route path="..." element={...} />
const routeRegex = /<Route\s+path=["']([^"']+)["']\s+element=\{<\s*([A-Za-z]+)/g;
let match;
const foundGuards = {};

while ((match = routeRegex.exec(appEntryContent)) !== null) {
  const routePath = match[1];
  const guardComponent = match[2];
  foundGuards[routePath] = guardComponent;
}

for (const [routePath, expectedGuard] of Object.entries(expectedGuards)) {
  if (!foundGuards[routePath]) {
    errors.push(`Route for ${routePath} not found in App.tsx.`);
  } else if (foundGuards[routePath] !== expectedGuard) {
    errors.push(`Route ${routePath} must be protected by ${expectedGuard}, but found ${foundGuards[routePath]}.`);
  }
}

// Check for explicit role assignment using specific email across whole active source
function checkFileForEmailRole(filePath) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.match(/email\s*===?\s*['"].*@.*['"]/i) || content.match(/['"].*@.*['"]\s*===?\s*email/i)) {
      errors.push(`${filePath} must not use specific email addresses for role validation.`);
    }
  }
}
const authContextPath = path.join(rootDir, 'src', 'auth', 'AuthContext.tsx');
checkFileForEmailRole(authContextPath);
const authHelperPath = path.join(rootDir, 'src', 'auth', 'authorizationHelper.ts');
checkFileForEmailRole(authHelperPath);

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

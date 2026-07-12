import re

content = """import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const appEntryPath = path.join(rootDir, 'src', 'App.tsx');
const appEntryContent = fs.readFileSync(appEntryPath, 'utf8');
const routeCatalogPath = path.join(rootDir, 'src', 'lib', 'routeCatalog.ts');
const routeCatalogContent = fs.readFileSync(routeCatalogPath, 'utf8');

let errors = [];

// App entry doesn't import Dashboard, CaptureForm, UnassignedIdentifierScreen, SearchScreen, etc
const forbiddenImports = ['Dashboard', 'CaptureForm', 'UnassignedIdentifierScreen', 'SearchScreen', 'OverviewScreen'];
for (const forbidden of forbiddenImports) {
  const staticRegex = new RegExp(`import\\s+.*?\\b${forbidden}\\b.*?from`, 'i');
  const lazyRegex = new RegExp(`import\\s*\\(\\s*['"].*?\\b${forbidden}\\b.*?['"]\\s*\\)`, 'i');
  if (staticRegex.test(appEntryContent) || lazyRegex.test(appEntryContent)) {
    errors.push(`App.tsx must not import ${forbidden}. It should be outside active routes.`);
  }
}

// Check for explicit role assignment using specific email across whole src
function checkFileForEmailRole(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      checkFileForEmailRole(fullPath);
    } else if (entry.isFile() && (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.match(/email\s*===?\\s*['"].*@.*['"]/i) || content.match(/['"].*@.*['"]\\s*===?\\s*email/i)) {
        errors.push(`${fullPath} must not use specific email addresses for role validation.`);
      }
    }
  }
}
checkFileForEmailRole(path.join(rootDir, 'src'));

// Write to identifiers/objectIdentifierBindings from active entry
if (appEntryContent.includes('objectIdentifierBindings') || appEntryContent.includes('identifiers')) {
    errors.push(`App.tsx must not reference legacy write targets like identifiers or objectIdentifierBindings.`);
}

// Parse routeCatalog
const routes = [];
const routeBlockRegex = /\{\s*path:\s*['"]([^'"]+)['"]\s*,\s*label:\s*['"][^'"]+['"]\s*,\s*description:\s*['"][^'"]+['"]\s*,\s*access:\s*['"]([^'"]+)['"]\s*,\s*isActive:\s*(true|false)\s*\}/g;
let match;
while ((match = routeBlockRegex.exec(routeCatalogContent)) !== null) {
  routes.push({
    path: match[1],
    access: match[2],
    isActive: match[3] === 'true'
  });
}

// Parse App.tsx routes
const routeRegex = /<Route\s+path=["']([^"']+)["']\s+element=\{<\s*([A-Za-z]+)/g;
const foundGuards = {};
while ((match = routeRegex.exec(appEntryContent)) !== null) {
  const routePath = match[1];
  const guardComponent = match[2];
  foundGuards[routePath] = guardComponent;
}
// Add explicit mapping for empty guards as 'None' instead of relying on the tag
const routeTagRegex = /<Route\s+path=["']([^"']+)["']\s+element=\{<([A-Za-z]+)/g;
while ((match = routeTagRegex.exec(appEntryContent)) !== null) {
  if (match[2] !== 'ProtectedRoute' && match[2] !== 'AdminRoute') {
    foundGuards[match[1]] = 'None';
  }
}

// Validate registry vs App.tsx
for (const route of routes) {
  if (!route.access) {
    errors.push(`Route ${route.path} is missing access policy in registry.`);
  }

  // legacy route check
  if (['/search', '/overview', '/unassigned'].includes(route.path) && route.isActive) {
    errors.push(`Legacy route ${route.path} must be inactive.`);
  }

  // Admin route check
  if (['/admin', '/admin/sitemap', '/developer', '/demo', '/library-demo', '/test'].includes(route.path) && route.access !== 'admin') {
    errors.push(`Route ${route.path} must be admin in registry.`);
  }

  // Exists in App.tsx?
  // We need to account for /* suffixes
  let searchPath = route.path;
  if (searchPath === '/developer') searchPath = '/developer/*'; // Hardcode known differences or check generic. Let's just check both.
  
  if (route.isActive) {
    if (!foundGuards[route.path] && !foundGuards[route.path + '/*']) {
      errors.push(`Active route ${route.path} not found in App.tsx runtime routes.`);
    } else {
      const guard = foundGuards[route.path] || foundGuards[route.path + '/*'];
      if (route.access === 'admin' && guard !== 'AdminRoute') {
        errors.push(`Admin route ${route.path} must use AdminRoute guard, found ${guard}.`);
      } else if (route.access === 'authenticated' && guard !== 'ProtectedRoute') {
        errors.push(`Authenticated route ${route.path} must use ProtectedRoute guard, found ${guard}.`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error("Routing boundary validation failed:");
  errors.forEach(err => console.error(" - " + err));
  process.exit(1);
} else {
  console.log("Routing boundary validation passed.");
}
"""

with open("scripts/test-routing-boundary.mjs", "w") as f:
    f.write(content)

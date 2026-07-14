import fs from 'fs';
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
  const staticRegex = new RegExp(`import\s+.*?\b${forbidden}\b.*?from`, 'i');
  const lazyRegex = new RegExp(`import\s*\(\s*['"].*?\b${forbidden}\b.*?['"]\s*\)`, 'i');
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
      if (content.match(/email\s*===?\s*['"].*@.*['"]/i) || content.match(/['"].*@.*['"]\s*===?\s*email/i)) {
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

const arrayStart = routeCatalogContent.indexOf('const routes');
if (arrayStart === -1) {
  errors.push("Failed to locate 'const routes' in routeCatalog.ts");
} else {
  const openBracket = routeCatalogContent.indexOf('[', arrayStart);
  const closeBracket = routeCatalogContent.indexOf('];', openBracket);
  if (openBracket === -1 || closeBracket === -1) {
    errors.push("Failed to locate routes array boundaries in routeCatalog.ts");
  } else {
    const routesArrayStr = routeCatalogContent.slice(openBracket + 1, closeBracket);
    const rawObjectCount = (routesArrayStr.match(/\{/g) || []).length;

    const objectRegex = /\{([^}]+)\}/g;
    let objMatch;
    while ((objMatch = objectRegex.exec(routesArrayStr)) !== null) {
      const objContent = objMatch[1];
      const obj = {};
      const kvRegex = /(\w+)\s*:\s*(['"]([^'"]*)['"]|true|false)/g;
      let kvMatch;
      while ((kvMatch = kvRegex.exec(objContent)) !== null) {
        const key = kvMatch[1];
        let value = kvMatch[2];
        if (value === 'true') {
          value = true;
        } else if (value === 'false') {
          value = false;
        } else {
          value = kvMatch[3];
        }
        obj[key] = value;
      }
      routes.push(obj);
    }

    if (routes.length === 0) {
      errors.push("Failed to parse any routes from catalog.");
    } else if (routes.length !== rawObjectCount) {
      errors.push(`Route count mismatch: Parsed ${routes.length} routes, but found ${rawObjectCount} raw objects in catalog.`);
    }
  }
}

// Parse App.tsx routes
const routeRegex = /<Route\s+path=["']([^"']+)["']\s+element=\{<\s*([A-Za-z]+)/g;
const foundGuards = {};
let match;
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

// Ensure removed routes are not registered in route catalog or App.tsx
const removedPaths = ['/developer', '/developer/*', '/demo', '/library-demo'];
for (const path of removedPaths) {
  if (routes.some(r => r.path === path)) {
    errors.push(`Removed route '${path}' must not be registered in the route catalog.`);
  }
  if (foundGuards[path] !== undefined) {
    errors.push(`Removed route '${path}' must not exist in App.tsx runtime routes.`);
  }
}

// Validate that no route object in the catalog has a "canonicalPath" property
for (const route of routes) {
  if (route.canonicalPath !== undefined) {
    errors.push(`Route '${route.path}' must not have a 'canonicalPath' property, as compatibility aliases are removed.`);
  }
}

// Canonical dev route requirements
const requiredCanonicalDevRoutes = [
  '/dev',
  '/dev/routing',
  '/dev/data-model',
  '/dev/security',
  '/dev/demo',
  '/dev/library-demo'
];

for (const path of requiredCanonicalDevRoutes) {
  const route = routes.find(r => r.path === path);
  if (!route) {
    errors.push(`Required canonical dev route '${path}' is missing from catalog.`);
  } else {
    if (route.surface !== 'dev') {
      errors.push(`Canonical dev route '${path}' must have 'dev' surface.`);
    }
    if (route.access !== 'admin') {
      errors.push(`Canonical dev route '${path}' must have 'admin' access.`);
    }
  }
}

// Validate registry vs App.tsx
for (const route of routes) {
  if (route.path === undefined) {
    errors.push(`A parsed route object is missing 'path' property: ${JSON.stringify(route)}`);
    continue;
  }

  if (!route.access) {
    errors.push(`Route ${route.path} is missing access policy in registry.`);
  }

  // Validate surface
  const validSurfaces = ['public', 'app', 'admin', 'dev', 'api', 'test'];
  if (!route.surface || !validSurfaces.includes(route.surface)) {
    errors.push(`Route ${route.path} has invalid or missing surface '${route.surface}'.`);
  }

  // legacy route check
  if (['/search', '/overview', '/unassigned'].includes(route.path) && route.isActive) {
    errors.push(`Legacy route ${route.path} must be inactive.`);
  }

  // Admin route check - for listed paths, access must be 'admin'
  if (['/admin', '/admin/sitemap', '/dev', '/dev/routing', '/dev/data-model', '/dev/security', '/dev/demo', '/dev/library-demo', '/test'].includes(route.path) && route.access !== 'admin') {
    errors.push(`Route ${route.path} must be admin in registry.`);
  }

  // Exists in App.tsx?
  if (route.isActive) {
    let hasMatch = false;
    let guard = 'None';

    if (foundGuards[route.path] !== undefined || foundGuards[route.path + '/*'] !== undefined) {
      hasMatch = true;
      guard = foundGuards[route.path] || foundGuards[route.path + '/*'];
    } else {
      // Check if covered by wildcard route like /dev/*
      for (const guardPath of Object.keys(foundGuards)) {
        if (guardPath.endsWith('/*')) {
          const prefix = guardPath.slice(0, -2);
          if (route.path === prefix || route.path.startsWith(prefix + '/')) {
            hasMatch = true;
            guard = foundGuards[guardPath];
            break;
          }
        }
      }
    }

    if (!hasMatch) {
      errors.push(`Active route ${route.path} not found in App.tsx runtime routes.`);
    } else {
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

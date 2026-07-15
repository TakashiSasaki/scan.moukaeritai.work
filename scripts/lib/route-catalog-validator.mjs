export function validateRouteCatalog(routes, { foundGuards } = {}) {
  const errors = [];

  if (!Array.isArray(routes)) {
    return ["Route catalog must be an array."];
  }

  if (routes.length === 0) {
    return ["Route catalog must not be empty."];
  }

  const seenPaths = new Set();
  const authorizedDynamicPaths = ['/object/:id', '/item/:id'];
  const removedPaths = ['/developer', '/developer/*', '/demo', '/library-demo'];
  const requiredCanonicalDevRoutes = [
    '/dev',
    '/dev/routing',
    '/dev/data-model',
    '/dev/security',
    '/dev/demo',
    '/dev/library-demo'
  ];

  if (foundGuards) {
    for (const path of removedPaths) {
      if (foundGuards[path] !== undefined) {
        errors.push(`Removed route '${path}' must not exist in App.tsx runtime routes.`);
      }
    }
  }

  for (const route of routes) {
    // 1. Check if all six required properties are defined in the catalog
    const requiredKeys = ['path', 'label', 'description', 'access', 'isActive', 'surface'];
    for (const key of requiredKeys) {
      if (route[key] === undefined) {
        errors.push(`Route is missing required property '${key}': ${JSON.stringify(route)}`);
      }
    }

    // Validate path is string
    if (typeof route.path !== 'string' || route.path.trim() === '') {
      errors.push(`Route path must be a non-empty string, got ${typeof route.path}`);
      continue;
    }

    // Check duplicate paths
    if (seenPaths.has(route.path)) {
      errors.push(`Duplicate path entry found: '${route.path}'`);
    } else {
      seenPaths.add(route.path);
    }

    // Validate path format (must start with /)
    if (!route.path.startsWith('/')) {
      errors.push(`Route path '${route.path}' is invalid: must start with a '/'.`);
    }

    // Check for compatibility alias canonicalPath (must not exist)
    if (route.canonicalPath !== undefined) {
      errors.push(`Route '${route.path}' must not have a 'canonicalPath' property, as compatibility aliases are removed.`);
    }

    // Map surface to mappedSurface
    const surfaceMap = {
      'public': '/',
      'app': '/app',
      'admin': '/admin',
      'dev': '/dev',
      'api': '/api',
      'test': '/test'
    };
    const mappedSurface = surfaceMap[route.surface];

    // Validate role/access value
    const role = route.access === 'public' ? 'unauthenticated' : 'authenticated';
    if (route.access !== undefined && !['public', 'authenticated', 'admin'].includes(route.access)) {
      errors.push(`Route '${route.path}': access must be one of: "public", "authenticated", "admin", got '${route.access}'`);
    }

    // Validate surface value
    if (!['/', '/app', '/admin', '/dev', '/api', '/test'].includes(mappedSurface)) {
      errors.push(`Route '${route.path}': surface must be one of: "public", "app", "admin", "dev", "api", "test", got '${route.surface}'`);
    }

    // Validate label
    if (route.label !== undefined && (typeof route.label !== 'string' || route.label.trim() === '')) {
      errors.push(`Route '${route.path}': label must be a non-empty string.`);
    }

    // 2. Every path must align with its declared surface prefix
    const pathPrefixAlignment = {
      '/dev': (p) => p.startsWith('/dev'),
      '/admin': (p) => p.startsWith('/admin'),
      '/test': (p) => p.startsWith('/test'),
      '/api': (p) => p.startsWith('/api'),
      '/app': (p) => p.startsWith('/app') || p.startsWith('/settings') || p.startsWith('/object') || p.startsWith('/item') || p.startsWith('/search') || p.startsWith('/overview') || p.startsWith('/unassigned'),
      '/': (p) => p === '/' || p.startsWith('/forbidden')
    };

    if (mappedSurface && pathPrefixAlignment[mappedSurface]) {
      if (!pathPrefixAlignment[mappedSurface](route.path)) {
        errors.push(`Route path '${route.path}' does not align with its declared surface prefix '${mappedSurface}'.`);
      }
    }

    // 3. Ensure no unrequested paths or aliases remain (such as /developer, /demo, /library-demo)
    if (removedPaths.includes(route.path)) {
      errors.push(`Removed route '${route.path}' must not be registered in the route catalog.`);
    }

    // 4. Do not allow paths that contain wildcards, dynamic segments, or parameter strings to be registered without explicit authorization
    if (route.path.includes(':') || route.path.includes('*') || route.path.includes('?')) {
      if (!authorizedDynamicPaths.includes(route.path)) {
        errors.push(`Route path '${route.path}' contains unauthorized wildcards, dynamic segments, or parameters.`);
      }
    }

    // Validate isActive is a boolean
    if (route.isActive !== undefined && typeof route.isActive !== 'boolean') {
      errors.push(`Route '${route.path}': 'isActive' must be a boolean, got ${typeof route.isActive}.`);
    }

    // legacy route check
    if (['/search', '/overview', '/unassigned'].includes(route.path) && route.isActive) {
      errors.push(`Legacy route ${route.path} must be inactive.`);
    }

    // Admin route check - for listed paths, access must be 'admin'
    if (['/admin', '/admin/sitemap', '/dev', '/dev/routing', '/dev/data-model', '/dev/security', '/dev/demo', '/dev/library-demo', '/test'].includes(route.path) && route.access !== 'admin') {
      errors.push(`Route ${route.path} must be admin in registry.`);
    }

    // If foundGuards is supplied, validate App.tsx runtime routing
    if (foundGuards && route.isActive) {
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

  // Validate required canonical dev routes are present in catalog
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

  return errors;
}

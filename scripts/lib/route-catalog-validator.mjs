export function validateRouteCatalog(routes) {
  const errors = [];

  if (!Array.isArray(routes)) {
    return ["Route catalog must be an array."];
  }

  if (routes.length === 0) {
    return ["Route catalog must not be empty."];
  }

  const seenPaths = new Set();
  const removedPaths = ['/developer', '/developer/*', '/demo', '/library-demo'];
  const requiredCanonicalDevRoutes = [
    '/dev',
    '/dev/routing',
    '/dev/data-model',
    '/dev/security',
    '/dev/demo',
    '/dev/library-demo'
  ];

  for (const route of routes) {
    // 1. Enforce documented route object invariants
    // Required properties: path, label, description, access, isActive, surface
    const requiredKeys = ['path', 'label', 'description', 'access', 'isActive', 'surface'];
    let hasMissingProperty = false;
    for (const key of requiredKeys) {
      if (route[key] === undefined) {
        errors.push(`Route is missing required property '${key}': ${JSON.stringify(route)}`);
        hasMissingProperty = true;
      }
    }

    if (hasMissingProperty) {
      continue;
    }

    // path validation
    if (typeof route.path !== 'string') {
      errors.push(`Route path must be a non-empty string, got ${typeof route.path}`);
    } else if (route.path.trim() === '') {
      errors.push(`Route path must be a non-empty string, got empty string`);
    } else if (!route.path.startsWith('/')) {
      errors.push(`Route path '${route.path}' is invalid: must start with a '/'.`);
    }

    // label validation
    if (typeof route.label !== 'string') {
      errors.push(`Route '${route.path}': label must be a string, got ${typeof route.label}.`);
    } else if (route.label.trim() === '') {
      errors.push(`Route '${route.path}': label must be a non-empty string.`);
    }

    // description validation
    if (typeof route.description !== 'string') {
      errors.push(`Route '${route.path}': description must be a string, got ${typeof route.description}.`);
    } else if (route.description.trim() === '') {
      errors.push(`Route '${route.path}': description must be a non-empty string.`);
    }

    // access validation
    if (typeof route.access !== 'string') {
      errors.push(`Route '${route.path}': access must be a string, got ${typeof route.access}.`);
    } else if (!['public', 'authenticated', 'admin'].includes(route.access)) {
      errors.push(`Route '${route.path}': access must be one of: "public", "authenticated", "admin", got '${route.access}'`);
    }

    // isActive validation
    if (typeof route.isActive !== 'boolean') {
      errors.push(`Route '${route.path}': 'isActive' must be a boolean, got ${typeof route.isActive}.`);
    }

    // surface validation
    if (typeof route.surface !== 'string') {
      errors.push(`Route '${route.path}': surface must be a string, got ${typeof route.surface}.`);
    } else if (!['public', 'app', 'admin', 'dev', 'api', 'test'].includes(route.surface)) {
      errors.push(`Route '${route.path}': surface must be one of: "public", "app", "admin", "dev", "api", "test", got '${route.surface}'`);
    }

    // check duplicate paths (only if path is valid string)
    if (typeof route.path === 'string' && route.path.trim() !== '') {
      if (seenPaths.has(route.path)) {
        errors.push(`Duplicate path entry found: '${route.path}'`);
      } else {
        seenPaths.add(route.path);
      }
    }

    // Check for compatibility alias canonicalPath (must not exist)
    if (route.canonicalPath !== undefined) {
      errors.push(`Route '${route.path}' must not have a 'canonicalPath' property, as compatibility aliases are removed.`);
    }

    // Keep the specific compatibility-removal rules
    if (removedPaths.includes(route.path)) {
      errors.push(`Removed route '${route.path}' must not be registered in the route catalog.`);
    }

    // legacy route check
    if (['/search', '/overview', '/unassigned'].includes(route.path) && route.isActive === true) {
      errors.push(`Legacy route ${route.path} must be inactive.`);
    }

    // Admin route check - for listed paths, access must be 'admin'
    if (['/admin', '/admin/sitemap', '/dev', '/dev/routing', '/dev/data-model', '/dev/security', '/dev/demo', '/dev/library-demo', '/test'].includes(route.path) && route.access !== 'admin') {
      errors.push(`Route ${route.path} must be admin in registry.`);
    }
  }

  // Validate required canonical dev routes are present in catalog and satisfy conditions
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
      if (route.isActive !== true) {
        errors.push(`Canonical dev route '${path}' must be active.`);
      }
    }
  }

  return errors;
}

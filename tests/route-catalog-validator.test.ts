import { describe, test, expect } from 'vitest';
import { validateRouteCatalog } from '../scripts/lib/route-catalog-validator.mjs';

describe('route catalog validator unit tests', () => {
  const validDevRoutes = [
    { path: '/dev', label: 'Dev', description: 'Dev Home', access: 'admin', isActive: true, surface: 'dev' },
    { path: '/dev/routing', label: 'Routing', description: 'Routing Map', access: 'admin', isActive: true, surface: 'dev' },
    { path: '/dev/data-model', label: 'Data Model', description: 'Data schema', access: 'admin', isActive: true, surface: 'dev' },
    { path: '/dev/security', label: 'Security', description: 'Security', access: 'admin', isActive: true, surface: 'dev' },
    { path: '/dev/demo', label: 'Demo', description: 'Demo', access: 'admin', isActive: true, surface: 'dev' },
    { path: '/dev/library-demo', label: 'Lib Demo', description: 'Lib Demo', access: 'admin', isActive: true, surface: 'dev' }
  ];

  const validBaseRoute = { path: '/', label: 'Home', description: 'Main page', access: 'public', isActive: true, surface: 'public' };

  test('validates a completely valid minimal catalog', () => {
    const catalog = [validBaseRoute, ...validDevRoutes];
    const errors = validateRouteCatalog(catalog);
    expect(errors).toEqual([]);
  });

  test('rejects an empty catalog', () => {
    const errors = validateRouteCatalog([]);
    expect(errors).toContain('Route catalog must not be empty.');
  });

  test('rejects catalog missing required properties', () => {
    const invalidRoute = { path: '/app/dashboard', label: 'Dashboard' }; // missing access, isActive, surface, description
    const catalog = [invalidRoute, validBaseRoute, ...validDevRoutes];
    const errors = validateRouteCatalog(catalog);
    expect(errors.some(err => err.includes("missing required property"))).toBe(true);
  });

  test('rejects invalid path formats (must start with /)', () => {
    const invalidRoute = { path: 'app/dashboard', label: 'Dashboard', description: 'Dash', access: 'authenticated', isActive: true, surface: 'app' };
    const catalog = [invalidRoute, validBaseRoute, ...validDevRoutes];
    const errors = validateRouteCatalog(catalog);
    expect(errors.some(err => err.includes("must start with a '/'"))).toBe(true);
  });

  test('rejects duplicate paths', () => {
    const duplicateRoute = { path: '/dev', label: 'Dev Dup', description: 'Dup description', access: 'admin', isActive: true, surface: 'dev' };
    const catalog = [validBaseRoute, ...validDevRoutes, duplicateRoute];
    const errors = validateRouteCatalog(catalog);
    expect(errors.some(err => err.includes("Duplicate path entry found"))).toBe(true);
  });

  test('rejects paths not aligning with surface prefix', () => {
    const mismatchedRoute = { path: '/dev/mismatched', label: 'Mismatched', description: 'Mismatched', access: 'authenticated', isActive: true, surface: 'app' };
    const catalog = [validBaseRoute, ...validDevRoutes, mismatchedRoute];
    const errors = validateRouteCatalog(catalog);
    expect(errors.some(err => err.includes("does not align with its declared surface prefix"))).toBe(true);
  });

  test('rejects removed paths (such as /developer)', () => {
    const removedRoute = { path: '/developer', label: 'Developer', description: 'Developer info', access: 'admin', isActive: true, surface: 'dev' };
    const catalog = [validBaseRoute, ...validDevRoutes, removedRoute];
    const errors = validateRouteCatalog(catalog);
    expect(errors.some(err => err.includes("must not be registered in the route catalog"))).toBe(true);
  });

  test('allows authorized dynamic paths and rejects unauthorized dynamic paths', () => {
    const authorizedRoute = { path: '/object/:id', label: 'Object details', description: 'Detail', access: 'authenticated', isActive: true, surface: 'app' };
    const unauthorizedRoute = { path: '/app/settings/:section', label: 'Section', description: 'Section', access: 'authenticated', isActive: true, surface: 'app' };

    const errorsAuthorized = validateRouteCatalog([validBaseRoute, ...validDevRoutes, authorizedRoute]);
    expect(errorsAuthorized).toEqual([]);

    const errorsUnauthorized = validateRouteCatalog([validBaseRoute, ...validDevRoutes, unauthorizedRoute]);
    expect(errorsUnauthorized.some(err => err.includes("contains unauthorized wildcards"))).toBe(true);
  });

  test('rejects missing canonical dev routes', () => {
    const catalog = [validBaseRoute]; // missing /dev/routing, etc.
    const errors = validateRouteCatalog(catalog);
    expect(errors.some(err => err.includes("missing from catalog"))).toBe(true);
  });

  test('validates App.tsx guards if foundGuards option is provided', () => {
    const catalog = [validBaseRoute, ...validDevRoutes];
    const foundGuards = {
      '/': 'None',
      '/dev': 'AdminRoute',
      '/dev/routing': 'AdminRoute',
      '/dev/data-model': 'AdminRoute',
      '/dev/security': 'AdminRoute',
      '/dev/demo': 'AdminRoute',
      '/dev/library-demo': 'AdminRoute'
    };
    const errors = validateRouteCatalog(catalog, { foundGuards });
    expect(errors).toEqual([]);

    // Mismatched guard
    const badGuards = {
      ...foundGuards,
      '/dev': 'ProtectedRoute' // must be AdminRoute
    };
    const badErrors = validateRouteCatalog(catalog, { foundGuards: badGuards });
    expect(badErrors.some(err => err.includes("must use AdminRoute guard"))).toBe(true);
  });
});

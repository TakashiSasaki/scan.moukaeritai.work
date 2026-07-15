import { describe, test, expect } from 'vitest';
import { validateRouteCatalog } from '../scripts/lib/route-catalog-validator.mjs';
import { routes } from '../src/lib/routeCatalog';

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

  // --- VALID CASES THAT MUST PASS ---

  test('validates a completely valid minimal catalog', () => {
    const catalog = [validBaseRoute, ...validDevRoutes];
    const errors = validateRouteCatalog(catalog);
    expect(errors).toEqual([]);
  });

  test('validates the actual current route catalog', () => {
    const errors = validateRouteCatalog(routes);
    expect(errors).toEqual([]);
  });

  test('validates a root "/" public route', () => {
    const customRoute = { path: '/', label: 'Root Page', description: 'Root description', access: 'public', isActive: true, surface: 'public' };
    const catalog = [customRoute, ...validDevRoutes];
    const errors = validateRouteCatalog(catalog);
    expect(errors).toEqual([]);
  });

  test('validates a "/profile" app-surface route', () => {
    const customRoute = { path: '/profile', label: 'Profile', description: 'User profile page', access: 'authenticated', isActive: true, surface: 'app' };
    const catalog = [validBaseRoute, ...validDevRoutes, customRoute];
    const errors = validateRouteCatalog(catalog);
    expect(errors).toEqual([]);
  });

  test('validates a "/object/:id/history/:revision" app-surface route', () => {
    const customRoute = { path: '/object/:id/history/:revision', label: 'Object History', description: 'Object revision history', access: 'authenticated', isActive: true, surface: 'app' };
    const catalog = [validBaseRoute, ...validDevRoutes, customRoute];
    const errors = validateRouteCatalog(catalog);
    expect(errors).toEqual([]);
  });

  test('validates a valid route containing "?" in its path string', () => {
    const customRoute = { path: '/app/foo?bar', label: 'Foo Query', description: 'Foo query details', access: 'authenticated', isActive: true, surface: 'app' };
    const catalog = [validBaseRoute, ...validDevRoutes, customRoute];
    const errors = validateRouteCatalog(catalog);
    expect(errors).toEqual([]);
  });

  test('validates a valid route containing "*" that is not one of the specifically removed historical paths', () => {
    const customRoute = { path: '/app/wildcard/*', label: 'Wildcard Page', description: 'Wildcard subpages', access: 'authenticated', isActive: true, surface: 'app' };
    const catalog = [validBaseRoute, ...validDevRoutes, customRoute];
    const errors = validateRouteCatalog(catalog);
    expect(errors).toEqual([]);
  });

  // --- INVALID CASES THAT MUST FAIL ---

  test('rejects when routes is not an array', () => {
    const errors = validateRouteCatalog("not-an-array" as any);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('Route catalog must be an array.');
  });

  test('rejects an empty catalog', () => {
    const errors = validateRouteCatalog([]);
    expect(errors).toContain('Route catalog must not be empty.');
  });

  test('rejects route with missing path', () => {
    const invalidRoute = { label: 'Home', description: 'Desc', access: 'public', isActive: true, surface: 'public' };
    const catalog = [invalidRoute as any, ...validDevRoutes];
    const errors = validateRouteCatalog(catalog);
    expect(errors.length).toBeGreaterThan(0);
  });

  test('rejects route with missing label', () => {
    const invalidRoute = { path: '/', description: 'Desc', access: 'public', isActive: true, surface: 'public' };
    const catalog = [invalidRoute as any, ...validDevRoutes];
    const errors = validateRouteCatalog(catalog);
    expect(errors.length).toBeGreaterThan(0);
  });

  test('rejects route with missing description', () => {
    const invalidRoute = { path: '/', label: 'Home', access: 'public', isActive: true, surface: 'public' };
    const catalog = [invalidRoute as any, ...validDevRoutes];
    const errors = validateRouteCatalog(catalog);
    expect(errors.length).toBeGreaterThan(0);
  });

  test('rejects route with missing access', () => {
    const invalidRoute = { path: '/', label: 'Home', description: 'Desc', isActive: true, surface: 'public' };
    const catalog = [invalidRoute as any, ...validDevRoutes];
    const errors = validateRouteCatalog(catalog);
    expect(errors.length).toBeGreaterThan(0);
  });

  test('rejects route with missing isActive', () => {
    const invalidRoute = { path: '/', label: 'Home', description: 'Desc', access: 'public', surface: 'public' };
    const catalog = [invalidRoute as any, ...validDevRoutes];
    const errors = validateRouteCatalog(catalog);
    expect(errors.length).toBeGreaterThan(0);
  });

  test('rejects route with missing surface', () => {
    const invalidRoute = { path: '/', label: 'Home', description: 'Desc', access: 'public', isActive: true };
    const catalog = [invalidRoute as any, ...validDevRoutes];
    const errors = validateRouteCatalog(catalog);
    expect(errors.length).toBeGreaterThan(0);
  });

  test('rejects route with path as an empty string', () => {
    const invalidRoute = { path: '   ', label: 'Home', description: 'Desc', access: 'public', isActive: true, surface: 'public' };
    const catalog = [invalidRoute, ...validDevRoutes];
    const errors = validateRouteCatalog(catalog);
    expect(errors.length).toBeGreaterThan(0);
  });

  test('rejects route with path not starting with "/"', () => {
    const invalidRoute = { path: 'foo', label: 'Home', description: 'Desc', access: 'public', isActive: true, surface: 'public' };
    const catalog = [invalidRoute, ...validDevRoutes];
    const errors = validateRouteCatalog(catalog);
    expect(errors.length).toBeGreaterThan(0);
  });

  test('rejects route with label as an empty string', () => {
    const invalidRoute = { path: '/', label: '   ', description: 'Desc', access: 'public', isActive: true, surface: 'public' };
    const catalog = [invalidRoute, ...validDevRoutes];
    const errors = validateRouteCatalog(catalog);
    expect(errors.length).toBeGreaterThan(0);
  });

  test('rejects route with label not as a string', () => {
    const invalidRoute = { path: '/', label: 123 as any, description: 'Desc', access: 'public', isActive: true, surface: 'public' };
    const catalog = [invalidRoute, ...validDevRoutes];
    const errors = validateRouteCatalog(catalog);
    expect(errors.length).toBeGreaterThan(0);
  });

  test('rejects route with description as an empty string', () => {
    const invalidRoute = { path: '/', label: 'Home', description: '   ', access: 'public', isActive: true, surface: 'public' };
    const catalog = [invalidRoute, ...validDevRoutes];
    const errors = validateRouteCatalog(catalog);
    expect(errors.length).toBeGreaterThan(0);
  });

  test('rejects route with description not as a string', () => {
    const invalidRoute = { path: '/', label: 'Home', description: 123 as any, access: 'public', isActive: true, surface: 'public' };
    const catalog = [invalidRoute, ...validDevRoutes];
    const errors = validateRouteCatalog(catalog);
    expect(errors.length).toBeGreaterThan(0);
  });

  test('rejects route with access as "invalid"', () => {
    const invalidRoute = { path: '/', label: 'Home', description: 'Desc', access: 'invalid' as any, isActive: true, surface: 'public' };
    const catalog = [invalidRoute, ...validDevRoutes];
    const errors = validateRouteCatalog(catalog);
    expect(errors.length).toBeGreaterThan(0);
  });

  test('rejects route with access not as a string', () => {
    const invalidRoute = { path: '/', label: 'Home', description: 'Desc', access: true as any, isActive: true, surface: 'public' };
    const catalog = [invalidRoute, ...validDevRoutes];
    const errors = validateRouteCatalog(catalog);
    expect(errors.length).toBeGreaterThan(0);
  });

  test('rejects route with isActive as "true" (string)', () => {
    const invalidRoute = { path: '/', label: 'Home', description: 'Desc', access: 'public', isActive: 'true' as any, surface: 'public' };
    const catalog = [invalidRoute, ...validDevRoutes];
    const errors = validateRouteCatalog(catalog);
    expect(errors.length).toBeGreaterThan(0);
  });

  test('rejects route with surface as "invalid"', () => {
    const invalidRoute = { path: '/', label: 'Home', description: 'Desc', access: 'public', isActive: true, surface: 'invalid' as any };
    const catalog = [invalidRoute, ...validDevRoutes];
    const errors = validateRouteCatalog(catalog);
    expect(errors.length).toBeGreaterThan(0);
  });

  test('rejects route with surface not as a string', () => {
    const invalidRoute = { path: '/', label: 'Home', description: 'Desc', access: 'public', isActive: true, surface: true as any };
    const catalog = [invalidRoute, ...validDevRoutes];
    const errors = validateRouteCatalog(catalog);
    expect(errors.length).toBeGreaterThan(0);
  });

  test('rejects duplicate paths', () => {
    const duplicateRoute = { path: '/dev', label: 'Dev Dup', description: 'Dup description', access: 'admin', isActive: true, surface: 'dev' };
    const catalog = [validBaseRoute, ...validDevRoutes, duplicateRoute];
    const errors = validateRouteCatalog(catalog);
    expect(errors.some(err => err.includes("Duplicate path entry found"))).toBe(true);
  });

  test('rejects missing canonical /dev route', () => {
    const catalog = [validBaseRoute]; // missing all required canonical /dev routes
    const errors = validateRouteCatalog(catalog);
    expect(errors.some(err => err.includes("missing from catalog"))).toBe(true);
  });

  test('rejects when canonical /dev route has wrong surface', () => {
    const badDevRoutes = validDevRoutes.map(r => r.path === '/dev' ? { ...r, surface: 'app' as any } : r);
    const catalog = [validBaseRoute, ...badDevRoutes];
    const errors = validateRouteCatalog(catalog);
    expect(errors.some(err => err.includes("must have 'dev' surface"))).toBe(true);
  });

  test('rejects when canonical /dev route has wrong access', () => {
    const badDevRoutes = validDevRoutes.map(r => r.path === '/dev' ? { ...r, access: 'public' as any } : r);
    const catalog = [validBaseRoute, ...badDevRoutes];
    const errors = validateRouteCatalog(catalog);
    expect(errors.some(err => err.includes("must have 'admin' access"))).toBe(true);
  });

  test('rejects when canonical /dev route has isActive false', () => {
    const badDevRoutes = validDevRoutes.map(r => r.path === '/dev' ? { ...r, isActive: false } : r);
    const catalog = [validBaseRoute, ...badDevRoutes];
    const errors = validateRouteCatalog(catalog);
    expect(errors.some(err => err.includes("inactive") || err.includes("must be active"))).toBe(true);
  });

  test('rejects /developer when present', () => {
    const removedRoute = { path: '/developer', label: 'Developer', description: 'Developer info', access: 'admin', isActive: true, surface: 'dev' };
    const catalog = [validBaseRoute, ...validDevRoutes, removedRoute];
    const errors = validateRouteCatalog(catalog);
    expect(errors.some(err => err.includes("must not be registered in the route catalog"))).toBe(true);
  });

  test('rejects /developer/* when present', () => {
    const removedRoute = { path: '/developer/*', label: 'Developer Wild', description: 'Developer info wildcard', access: 'admin', isActive: true, surface: 'dev' };
    const catalog = [validBaseRoute, ...validDevRoutes, removedRoute];
    const errors = validateRouteCatalog(catalog);
    expect(errors.some(err => err.includes("must not be registered in the route catalog"))).toBe(true);
  });

  test('rejects /demo when present', () => {
    const removedRoute = { path: '/demo', label: 'Demo', description: 'Demo info', access: 'admin', isActive: true, surface: 'dev' };
    const catalog = [validBaseRoute, ...validDevRoutes, removedRoute];
    const errors = validateRouteCatalog(catalog);
    expect(errors.some(err => err.includes("must not be registered in the route catalog"))).toBe(true);
  });

  test('rejects /library-demo when present', () => {
    const removedRoute = { path: '/library-demo', label: 'Library Demo', description: 'Library info', access: 'admin', isActive: true, surface: 'dev' };
    const catalog = [validBaseRoute, ...validDevRoutes, removedRoute];
    const errors = validateRouteCatalog(catalog);
    expect(errors.some(err => err.includes("must not be registered in the route catalog"))).toBe(true);
  });

  test('rejects route with canonicalPath property', () => {
    const customRoute = { path: '/foo', label: 'Home', description: 'Desc', access: 'public', isActive: true, surface: 'public', canonicalPath: '/bar' };
    const catalog = [validBaseRoute, ...validDevRoutes, customRoute];
    const errors = validateRouteCatalog(catalog);
    expect(errors.some(err => err.includes("must not have a 'canonicalPath' property"))).toBe(true);
  });
});

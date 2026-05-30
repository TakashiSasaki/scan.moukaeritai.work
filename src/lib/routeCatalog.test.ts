import { describe, it, expect } from 'vitest';
import { routeGroups } from './routeCatalog';

describe('routeCatalog', () => {
  it('should not contain any duplicate route paths', () => {
    const paths = new Set<string>();

    for (const group of routeGroups) {
      for (const route of group.routes) {
        expect(paths.has(route.path)).toBe(false); // Fails if duplicate path found
        paths.add(route.path);
      }
    }
  });

  it('should include required developer documentation routes as public', () => {
    const expectedDeveloperRoutes = [
      '/developer',
      '/developer/routes',
      '/developer/data-model',
      '/developer/data-model-graph',
    ];

    const allRoutes = routeGroups.flatMap(group => group.routes);

    for (const path of expectedDeveloperRoutes) {
      const route = allRoutes.find(r => r.path === path);
      expect(route).toBeDefined();
      expect(route?.access).toBe('public');
    }
  });

  it('should include protected app routes with signed-in user access', () => {
    const allRoutes = routeGroups.flatMap(group => group.routes);

    const appRoute = allRoutes.find(r => r.path === '/app');
    expect(appRoute).toBeDefined();
    expect(appRoute?.access).toBe('signed-in user');

    const itemRoute = allRoutes.find(r => r.path === '/item/:id');
    if (itemRoute) {
      expect(itemRoute.access).toBe('signed-in user');
    }
  });

  it('should ensure admin routes are protected', () => {
    const allRoutes = routeGroups.flatMap(group => group.routes);
    const adminRoutes = allRoutes.filter(r => r.path.startsWith('/admin'));

    for (const route of adminRoutes) {
      expect(route.access).toBe('admin only');
    }
  });

  it('every route should have required metadata fields', () => {
    for (const group of routeGroups) {
      for (const route of group.routes) {
        expect(route.path).toBeDefined();
        expect(typeof route.path).toBe('string');

        expect(route.component).toBeDefined();
        expect(typeof route.component).toBe('string');

        expect(route.access).toBeDefined();
        expect(typeof route.access).toBe('string');

        expect(route.navigation).toBeDefined();
        expect(typeof route.navigation).toBe('string');

        expect(route.purpose).toBeDefined();
        expect(typeof route.purpose).toBe('string');
      }
    }
  });
});

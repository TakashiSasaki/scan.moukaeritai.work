import { routes } from "../lib/routeCatalog";

export type AuthorizationState = {
  authLoading: boolean;
  authorizationLoading: boolean;
  userPresent: boolean;
  isAdmin: boolean;
  authorizationError: boolean;
};

export type RouteAccess = "allow" | "login" | "forbidden" | "loading";

export function evaluateRouteAccess(state: AuthorizationState, path: string): RouteAccess {
  if (state.authLoading || state.authorizationLoading) {
    return "loading";
  }

  let accessPolicy = "public"; // default
  
  // Sort routes by length descending to match most specific first
  const sortedRoutes = [...routes].sort((a, b) => b.path.length - a.path.length);
  
  for (const route of sortedRoutes) {
    if (route.path === '/') {
      if (path === '/') {
        accessPolicy = route.access;
        break;
      }
      continue;
    }
    const routeRegex = new RegExp('^' + route.path.replace(/:\w+/g, '[^/]+').replace(/\*/g, '.*') + '(?:/.*)?$');
    if (routeRegex.test(path)) {
      accessPolicy = route.access;
      break;
    }
  }

  const isAdminRoute = accessPolicy === 'admin';
  const isProtectedRoute = accessPolicy === 'admin' || accessPolicy === 'authenticated';

  if (isProtectedRoute && !state.userPresent) {
    return "login";
  }

  if (isAdminRoute) {
    if (state.authorizationError || !state.isAdmin) {
      return "forbidden";
    }
  }

  return "allow";
}

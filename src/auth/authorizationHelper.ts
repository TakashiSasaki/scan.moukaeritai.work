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

  const isAdminRoute = path.startsWith("/admin") || path.startsWith("/developer");
  const isProtectedRoute = path.startsWith("/app") || path.startsWith("/settings") || isAdminRoute;

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

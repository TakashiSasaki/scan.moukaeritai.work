import { evaluateRouteAccess } from "../../src/auth/authorizationHelper";
import { describe, test, expect } from "vitest";

describe("evaluateRouteAccess", () => {
  test("unauthenticated access", () => {
    const state = { authLoading: false, authorizationLoading: false, userPresent: false, isAdmin: false, authorizationError: false };
    expect(evaluateRouteAccess(state, "/app")).toBe("login");
    expect(evaluateRouteAccess(state, "/admin")).toBe("login");
    expect(evaluateRouteAccess(state, "/admin/sitemap")).toBe("login");
    expect(evaluateRouteAccess(state, "/developer")).toBe("login");
    expect(evaluateRouteAccess(state, "/settings")).toBe("login");
  });

  test("authenticated non-admin access", () => {
    const state = { authLoading: false, authorizationLoading: false, userPresent: true, isAdmin: false, authorizationError: false };
    expect(evaluateRouteAccess(state, "/app")).toBe("allow");
    expect(evaluateRouteAccess(state, "/settings")).toBe("allow");
    expect(evaluateRouteAccess(state, "/admin")).toBe("forbidden");
    expect(evaluateRouteAccess(state, "/admin/sitemap")).toBe("forbidden");
    expect(evaluateRouteAccess(state, "/developer")).toBe("forbidden");
  });

  test("authenticated admin access", () => {
    const state = { authLoading: false, authorizationLoading: false, userPresent: true, isAdmin: true, authorizationError: false };
    expect(evaluateRouteAccess(state, "/app")).toBe("allow");
    expect(evaluateRouteAccess(state, "/admin")).toBe("allow");
    expect(evaluateRouteAccess(state, "/admin/sitemap")).toBe("allow");
    expect(evaluateRouteAccess(state, "/developer")).toBe("allow");
  });

  test("authorization error", () => {
    const state = { authLoading: false, authorizationLoading: false, userPresent: true, isAdmin: true, authorizationError: true };
    expect(evaluateRouteAccess(state, "/admin")).toBe("forbidden");
  });

  test("loading", () => {
    const state = { authLoading: true, authorizationLoading: false, userPresent: false, isAdmin: false, authorizationError: false };
    expect(evaluateRouteAccess(state, "/app")).toBe("loading");
    expect(evaluateRouteAccess(state, "/admin")).toBe("loading");
  });
});

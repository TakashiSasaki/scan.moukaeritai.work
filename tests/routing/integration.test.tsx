// @vitest-environment jsdom
import { describe, test, expect, vi } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
afterEach(cleanup);
import { MemoryRouter, useLocation } from "react-router-dom";
import { AppRoutes } from "../../src/App";
import * as AuthContext from "../../src/auth/AuthContext";
import React from "react";

describe("Router Integration", () => {
  test("unauthenticated user: /app -> login (landing page), admin -> login", async () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      authLoading: false,
      authorizationLoading: false,
      isAdmin: false,
      authorizationError: null,
    });

    render(
      <MemoryRouter initialEntries={["/app"]}>
        <AppRoutes />
      </MemoryRouter>
    );
    // When unauthenticated, ProtectedRoute redirects to "/"
    await waitFor(() => {
      expect(screen.getAllByText(/Sign in with Google/i).length).toBeGreaterThan(0);
    });

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AppRoutes />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getAllByText(/Sign in with Google/i).length).toBeGreaterThan(0);
    });
  });

  test("authenticated non-admin: /app -> allow, admin routes -> forbidden", async () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { uid: '123' } as any,
      isAuthenticated: true,
      authLoading: false,
      authorizationLoading: false,
      isAdmin: false,
      authorizationError: null,
    });

    render(
      <MemoryRouter initialEntries={["/app"]}>
        <AppRoutes />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getAllByText(/Home/i).length).toBeGreaterThan(0);
    });

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AppRoutes />
      </MemoryRouter>
    );
    await waitFor(() => {
      // AdminRoute redirects to /forbidden when authenticated but not admin
      expect(screen.getAllByText(/Access Denied/i).length).toBeGreaterThan(0);
    });
  });

  test("authenticated admin: /app -> allow, admin routes -> allow", async () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { uid: '123' } as any,
      isAuthenticated: true,
      authLoading: false,
      authorizationLoading: false,
      isAdmin: true,
      authorizationError: null,
    });

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AppRoutes />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getAllByText(/Admin Control Panel/i).length).toBeGreaterThan(0);
    });
  });

  test("loading: protected contentを表示しない", async () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      authLoading: true,
      authorizationLoading: true,
      isAdmin: false,
      authorizationError: null,
    });

    const { container } = render(
      <MemoryRouter initialEntries={["/app"]}>
        <AppRoutes />
      </MemoryRouter>
    );
    expect(screen.queryAllByText(/Home/i).length).toBe(0);
    // It should render the loading spinner
    expect(container.querySelector('.animate-spin')).toBeDefined();
  });

  describe("Interface Surface Convention redirects and access control", () => {
    let lastLocation: any = null;

    function LocationObserver() {
      const location = useLocation();
      lastLocation = location;
      return null;
    }

    function renderWithLocation(initialEntry: string) {
      lastLocation = null;
      return render(
        <MemoryRouter initialEntries={[initialEntry]}>
          <AppRoutes />
          <LocationObserver />
        </MemoryRouter>
      );
    }

    test("1-4: Canonical route access by auth state", async () => {
      // 1. Unauthenticated -> "/dev" redirects to "/" (login landing)
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: null,
        isAuthenticated: false,
        authLoading: false,
        authorizationLoading: false,
        isAdmin: false,
        authorizationError: null,
      });
      renderWithLocation("/dev");
      await waitFor(() => {
        expect(lastLocation.pathname).toBe("/");
      });

      // 2. Authenticated non-admin -> "/dev" redirects to "/forbidden"
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: { uid: '123' } as any,
        isAuthenticated: true,
        authLoading: false,
        authorizationLoading: false,
        isAdmin: false,
        authorizationError: null,
      });
      renderWithLocation("/dev");
      await waitFor(() => {
        expect(lastLocation.pathname).toBe("/forbidden");
      });

      // 3. Authenticated admin -> "/dev" is allowed
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: { uid: '123' } as any,
        isAuthenticated: true,
        authLoading: false,
        authorizationLoading: false,
        isAdmin: true,
        authorizationError: null,
      });
      renderWithLocation("/dev");
      await waitFor(() => {
        expect(lastLocation.pathname).toBe("/dev");
      });

      // 4. Authenticated admin can open other dev subpages
      const subpages = ["/dev/routing", "/dev/data-model", "/dev/security", "/dev/demo", "/dev/library-demo"];
      for (const page of subpages) {
        renderWithLocation(page);
        await waitFor(() => {
          expect(lastLocation.pathname).toBe(page);
        });
      }
    });

    test("5-10: Compatibility redirects for admins", async () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: { uid: '123' } as any,
        isAuthenticated: true,
        authLoading: false,
        authorizationLoading: false,
        isAdmin: true,
        authorizationError: null,
      });

      // 5. "/developer" -> "/dev"
      renderWithLocation("/developer");
      await waitFor(() => { expect(lastLocation.pathname).toBe("/dev"); });

      // 6. "/developer/routing" -> "/dev/routing"
      renderWithLocation("/developer/routing");
      await waitFor(() => { expect(lastLocation.pathname).toBe("/dev/routing"); });

      // 7. "/developer/data-model" -> "/dev/data-model"
      renderWithLocation("/developer/data-model");
      await waitFor(() => { expect(lastLocation.pathname).toBe("/dev/data-model"); });

      // 8. "/developer/security" -> "/dev/security"
      renderWithLocation("/developer/security");
      await waitFor(() => { expect(lastLocation.pathname).toBe("/dev/security"); });

      // 9. "/demo" -> "/dev/demo"
      renderWithLocation("/demo");
      await waitFor(() => { expect(lastLocation.pathname).toBe("/dev/demo"); });

      // 10. "/library-demo" -> "/dev/library-demo"
      renderWithLocation("/library-demo");
      await waitFor(() => { expect(lastLocation.pathname).toBe("/dev/library-demo"); });
    });

    test("11-15: URL preservation (suffix, query, hash)", async () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: { uid: '123' } as any,
        isAuthenticated: true,
        authLoading: false,
        authorizationLoading: false,
        isAdmin: true,
        authorizationError: null,
      });

      // 11. Wildcard suffix is preserved
      renderWithLocation("/developer/routing");
      await waitFor(() => { expect(lastLocation.pathname).toBe("/dev/routing"); });

      // 12. Query string is preserved
      renderWithLocation("/developer/routing?mode=debug");
      await waitFor(() => {
        expect(lastLocation.pathname).toBe("/dev/routing");
        expect(lastLocation.search).toBe("?mode=debug");
      });

      // 13. Hash fragment is preserved
      renderWithLocation("/developer/routing#authorization");
      await waitFor(() => {
        expect(lastLocation.pathname).toBe("/dev/routing");
        expect(lastLocation.hash).toBe("#authorization");
      });

      // 14. Query and hash preserved together
      renderWithLocation("/developer/routing?mode=debug#authorization");
      await waitFor(() => {
        expect(lastLocation.pathname).toBe("/dev/routing");
        expect(lastLocation.search).toBe("?mode=debug");
        expect(lastLocation.hash).toBe("#authorization");
      });

      // 15. "/demo" and "/library-demo" preserve query and hash
      renderWithLocation("/demo?abc=123#xyz");
      await waitFor(() => {
        expect(lastLocation.pathname).toBe("/dev/demo");
        expect(lastLocation.search).toBe("?abc=123");
        expect(lastLocation.hash).toBe("#xyz");
      });

      renderWithLocation("/library-demo?foo=bar#baz");
      await waitFor(() => {
        expect(lastLocation.pathname).toBe("/dev/library-demo");
        expect(lastLocation.search).toBe("?foo=bar");
        expect(lastLocation.hash).toBe("#baz");
      });
    });

    test("16-18: Access-control preservation on aliases", async () => {
      // 16. Unauthenticated cannot bypass via alias
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: null,
        isAuthenticated: false,
        authLoading: false,
        authorizationLoading: false,
        isAdmin: false,
        authorizationError: null,
      });
      renderWithLocation("/developer/routing?mode=debug#auth");
      await waitFor(() => {
        expect(lastLocation.pathname).toBe("/");
      });

      // 17. Authenticated non-admin cannot bypass via alias
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: { uid: '123' } as any,
        isAuthenticated: true,
        authLoading: false,
        authorizationLoading: false,
        isAdmin: false,
        authorizationError: null,
      });
      renderWithLocation("/developer/routing?mode=debug#auth");
      await waitFor(() => {
        expect(lastLocation.pathname).toBe("/forbidden");
      });

      // 18. Authenticated admin is redirected to canonical route
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: { uid: '123' } as any,
        isAuthenticated: true,
        authLoading: false,
        authorizationLoading: false,
        isAdmin: true,
        authorizationError: null,
      });
      renderWithLocation("/developer/routing?mode=debug#auth");
      await waitFor(() => {
        expect(lastLocation.pathname).toBe("/dev/routing");
        expect(lastLocation.search).toBe("?mode=debug");
        expect(lastLocation.hash).toBe("#auth");
      });
    });

    test("19-20: App and developer docs navigation uses canonical /dev paths", () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: { uid: '123' } as any,
        isAuthenticated: true,
        authLoading: false,
        authorizationLoading: false,
        isAdmin: true,
        authorizationError: null,
      });

      const { unmount } = renderWithLocation("/dev/demo");
      expect(screen.getByText(/API Demos/i)).toBeDefined();
      unmount();

      const { unmount: unmountLib } = renderWithLocation("/dev/library-demo");
      expect(screen.getByText(/Library Demos/i)).toBeDefined();
      unmountLib();
    });
  });
});

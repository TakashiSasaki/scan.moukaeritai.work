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

    test("1. Unauthenticated user opening /dev is redirected to /", async () => {
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
    });

    test("2. Authenticated non-administrator opening /dev is redirected to /forbidden", async () => {
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
    });

    test("3. Authenticated administrator can open /dev", async () => {
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
      expect(screen.getByText("System Overview")).toBeDefined();
    });

    test("4-8. Authenticated administrator can open /dev subpaths", async () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: { uid: '123' } as any,
        isAuthenticated: true,
        authLoading: false,
        authorizationLoading: false,
        isAdmin: true,
        authorizationError: null,
      });

      const subpages = ["/dev/routing", "/dev/data-model", "/dev/security", "/dev/demo", "/dev/library-demo"];
      for (const page of subpages) {
        const { unmount } = renderWithLocation(page);
        await waitFor(() => {
          expect(lastLocation.pathname).toBe(page);
        });
        unmount();
      }
    });

    test("9. /dev/demo renders DemoScreen, not DeveloperDocsPage", async () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: { uid: '123' } as any,
        isAuthenticated: true,
        authLoading: false,
        authorizationLoading: false,
        isAdmin: true,
        authorizationError: null,
      });
      renderWithLocation("/dev/demo");
      await waitFor(() => {
        expect(lastLocation.pathname).toBe("/dev/demo");
      });
      expect(screen.getByText("API Demos")).toBeDefined();
      expect(screen.queryByText("System Overview")).toBeNull();
    });

    test("10. /dev/library-demo renders LibraryDemoScreen, not DeveloperDocsPage", async () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: { uid: '123' } as any,
        isAuthenticated: true,
        authLoading: false,
        authorizationLoading: false,
        isAdmin: true,
        authorizationError: null,
      });
      renderWithLocation("/dev/library-demo");
      await waitFor(() => {
        expect(lastLocation.pathname).toBe("/dev/library-demo");
      });
      expect(screen.getByText("Library Demos")).toBeDefined();
      expect(screen.queryByText("System Overview")).toBeNull();
    });

    test("11. /dev/routing, /dev/data-model, and /dev/security render the intended sections", async () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: { uid: '123' } as any,
        isAuthenticated: true,
        authLoading: false,
        authorizationLoading: false,
        isAdmin: true,
        authorizationError: null,
      });

      const { unmount: unmount1 } = renderWithLocation("/dev/routing");
      await waitFor(() => {
        expect(screen.getByText("Routing documentation coming soon...")).toBeDefined();
      });
      unmount1();

      const { unmount: unmount2 } = renderWithLocation("/dev/data-model");
      await waitFor(() => {
        expect(screen.getByText("Data model documentation coming soon...")).toBeDefined();
      });
      unmount2();

      const { unmount: unmount3 } = renderWithLocation("/dev/security");
      await waitFor(() => {
        expect(screen.getByText("Security documentation coming soon...")).toBeDefined();
      });
      unmount3();
    });

    test("12. Unmatched path like /developer/routing follows normal unmatched-route fallback to /", async () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: { uid: '123' } as any,
        isAuthenticated: true,
        authLoading: false,
        authorizationLoading: false,
        isAdmin: true,
        authorizationError: null,
      });
      renderWithLocation("/developer/routing");
      await waitFor(() => {
        expect(lastLocation.pathname).toBe("/");
      });
    });

    test("13. Application navigation link in profile menu uses /dev", async () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: { uid: '123', displayName: "Takashi" } as any,
        isAuthenticated: true,
        authLoading: false,
        authorizationLoading: false,
        isAdmin: true,
        authorizationError: null,
      });
      renderWithLocation("/app");
      
      const profileBtn = screen.getByText("Takashi");
      profileBtn.click();

      const devDocsBtn = await screen.findByText("Developer Docs");
      devDocsBtn.click();

      await waitFor(() => {
        expect(lastLocation.pathname).toBe("/dev");
      });
    });

    test("14. EFP baseline navigation Read Developer Docs action uses /dev", async () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: { uid: '123' } as any,
        isAuthenticated: true,
        authLoading: false,
        authorizationLoading: false,
        isAdmin: true,
        authorizationError: null,
      });
      renderWithLocation("/app");

      const readDocsBtn = screen.getByText("Read Developer Docs");
      readDocsBtn.click();

      await waitFor(() => {
        expect(lastLocation.pathname).toBe("/dev");
      });
    });

    test("15. Developer Docs sidebar navigation uses only /dev canonical paths and contains no /developer", async () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: { uid: '123' } as any,
        isAuthenticated: true,
        authLoading: false,
        authorizationLoading: false,
        isAdmin: true,
        authorizationError: null,
      });
      renderWithLocation("/dev");

      const routingBtn = screen.getByText("Routing");
      const dataModelBtn = screen.getByText("Data Model");
      const securityBtn = screen.getByText("Security");
      const overviewBtn = screen.getByText("Overview");

      routingBtn.click();
      await waitFor(() => { expect(lastLocation.pathname).toBe("/dev/routing"); });

      dataModelBtn.click();
      await waitFor(() => { expect(lastLocation.pathname).toBe("/dev/data-model"); });

      securityBtn.click();
      await waitFor(() => { expect(lastLocation.pathname).toBe("/dev/security"); });

      overviewBtn.click();
      await waitFor(() => { expect(lastLocation.pathname).toBe("/dev"); });

      const buttons = screen.getAllByRole("button");
      buttons.forEach(btn => {
        const onclickStr = btn.getAttribute("onclick") || "";
        expect(onclickStr).not.toContain("/developer");
      });
    });
  });
});

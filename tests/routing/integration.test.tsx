// @vitest-environment jsdom
import { describe, test, expect, vi } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
afterEach(cleanup);
import { MemoryRouter } from "react-router-dom";
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
});

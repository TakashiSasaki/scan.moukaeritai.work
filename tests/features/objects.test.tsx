// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { validateAndBuildObjectDoc } from "../../src/features/objects/objectRepository";
import * as objectRepository from "../../src/features/objects/objectRepository";
import * as AuthContext from "../../src/auth/AuthContext";
import ObjectCreatePage from "../../src/features/objects/ObjectCreatePage";
import ObjectDetailPage from "../../src/features/objects/ObjectDetailPage";
import MyObjectsSection from "../../src/features/objects/MyObjectsSection";
import { doc, setDoc } from "firebase/firestore";

// Mock Firebase
vi.mock('../../src/lib/firebase', () => ({
  db: {},
  auth: {
    currentUser: { uid: 'test-user-id' }
  }
}));

// Mock Firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  setDoc: vi.fn(),
  where: vi.fn(),
  serverTimestamp: vi.fn(() => 'mock-server-timestamp')
}));

describe("EFP-native Objects Core Logic & Repository", () => {
  test("validateAndBuildObjectDoc builds valid object document according to EFP guidelines", () => {
    const params = {
      name: "   Calibration Unit A   ",
      description: "  Technical baseline markings.  ",
      ownerId: "test-user-id"
    };

    const docData = validateAndBuildObjectDoc(params);

    // 1. UUIDv7形式のobjectIdを生成する
    const uuidv7Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(docData.objectId).toMatch(uuidv7Regex);

    // 2. ownerIdが認証UIDから設定される
    expect(docData.ownerId).toBe("test-user-id");

    // 3. statusがactiveになる
    expect(docData.status).toBe("active");

    // 4. nameをtrimする
    expect(docData.name).toBe("Calibration Unit A");
    expect(docData.description).toBe("Technical baseline markings.");

    // 5. 許可されていないfieldを生成しない（Firestore Rules hasOnly に対応）
    const allowedKeys = ['objectId', 'ownerId', 'name', 'description', 'status', '_meta'];
    const keys = Object.keys(docData);
    keys.forEach(k => {
      expect(allowedKeys).toContain(k);
    });

    // 6. _meta fields are correctly set
    expect(docData._meta).toBeDefined();
    expect(docData._meta.recordCreatedAt).toBe('mock-server-timestamp');
    expect(docData._meta.recordUpdatedAt).toBe('mock-server-timestamp');
    expect(docData._meta.recordCreatedBy).toBe("test-user-id");
    expect(docData._meta.recordUpdatedBy).toBe("test-user-id");
    expect(docData._meta.schemaVersion).toBe(1);
  });

  test("validateAndBuildObjectDoc rejects empty name", () => {
    expect(() => validateAndBuildObjectDoc({
      name: "   ",
      ownerId: "test-user-id"
    })).toThrow("Name is required");
  });

  test("validateAndBuildObjectDoc rejects name > 200 characters", () => {
    const longName = "a".repeat(201);
    expect(() => validateAndBuildObjectDoc({
      name: longName,
      ownerId: "test-user-id"
    })).toThrow("Name must be 200 characters or less");
  });

  test("validateAndBuildObjectDoc rejects description > 1024 characters", () => {
    const longDesc = "a".repeat(1025);
    expect(() => validateAndBuildObjectDoc({
      name: "Valid Name",
      description: longDesc,
      ownerId: "test-user-id"
    })).toThrow("Description must be 1024 characters or less");
  });

  test("createObject derives and overrides ownerId with auth.currentUser.uid to prevent spoofing", async () => {
    vi.mocked(setDoc).mockResolvedValue(undefined as any);
    vi.mocked(doc).mockReturnValue({} as any);

    const result = await objectRepository.createObject({
      name: "Spoofing Attempt",
      description: "Trying to write other user's ownerId",
      ownerId: "attacker-user-id"
    });
    expect(result.ownerId).toBe("test-user-id");
    expect(result._meta.recordCreatedBy).toBe("test-user-id");
  });
});

describe("EFP-native Objects UI and Routing Mocking Tests", () => {
  beforeEach(() => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { uid: 'test-user-id', displayName: 'Test User', email: 'test@example.com' } as any,
      isAuthenticated: true,
      authLoading: false,
      authorizationLoading: false,
      isAdmin: false,
      authorizationError: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  test("MyObjectsSection renders objects list, loading, empty, and error states", async () => {
    const mockObjects = [
      { objectId: 'obj-1', ownerId: 'test-user-id', name: 'Item Alpha', description: 'Desc Alpha', status: 'active' as const },
      { objectId: 'obj-2', ownerId: 'test-user-id', name: 'Item Beta', description: 'Desc Beta', status: 'active' as const },
    ];

    const listSpy = vi.spyOn(objectRepository, 'listMyObjects').mockResolvedValue(mockObjects);

    const { unmount } = render(
      <MemoryRouter>
        <MyObjectsSection />
      </MemoryRouter>
    );

    // Initial loading or loaded elements
    await waitFor(() => {
      expect(screen.getByText('Item Alpha')).toBeDefined();
      expect(screen.getByText('Item Beta')).toBeDefined();
    });

    unmount();

    // Test empty state
    vi.spyOn(objectRepository, 'listMyObjects').mockResolvedValue([]);
    render(
      <MemoryRouter>
        <MyObjectsSection />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No Objects Found')).toBeDefined();
    });

    cleanup();

    // Test error state
    vi.spyOn(objectRepository, 'listMyObjects').mockRejectedValue(new Error("Firestore fetch failed"));
    render(
      <MemoryRouter>
        <MyObjectsSection />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Error Loading Objects')).toBeDefined();
    });
  });

  test("ObjectCreatePage handles form inputs, validation, and submission", async () => {
    const createSpy = vi.spyOn(objectRepository, 'createObject').mockResolvedValue({
      objectId: 'new-uuid-7',
      ownerId: 'test-user-id',
      name: 'Created Item',
      description: 'Desc',
      status: 'active'
    });

    render(
      <MemoryRouter>
        <ObjectCreatePage />
      </MemoryRouter>
    );

    const nameInput = screen.getByLabelText(/Object Name/i);
    const descInput = screen.getByLabelText(/Description/i);
    const submitBtn = screen.getByRole('button', { name: /Create Object Record/i });

    // Try submitting with invalid empty name (disabled)
    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);

    // Enter valid data
    fireEvent.change(nameInput, { target: { value: 'New Test Object' } });
    fireEvent.change(descInput, { target: { value: 'New Description' } });

    expect((submitBtn as HTMLButtonElement).disabled).toBe(false);

    // Submit
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({
        name: 'New Test Object',
        description: 'New Description',
        ownerId: 'test-user-id'
      });
    });
  });

  test("ObjectDetailPage handles normal retrieval, permission-denied, and not-found states", async () => {
    const mockObject = {
      objectId: 'obj-999',
      ownerId: 'test-user-id',
      name: 'Registered Gadget',
      description: 'Markings.',
      status: 'active' as const,
      _meta: {
        recordCreatedAt: { toDate: () => new Date('2026-01-01T00:00:00Z') },
        recordUpdatedAt: { toDate: () => new Date('2026-01-02T00:00:00Z') },
        recordCreatedBy: 'test-user-id',
        recordUpdatedBy: 'test-user-id',
        schemaVersion: 1
      }
    };

    const getSpy = vi.spyOn(objectRepository, 'getObject').mockResolvedValue(mockObject);

    const { unmount } = render(
      <MemoryRouter initialEntries={["/object/obj-999"]}>
        <Routes>
          <Route path="/object/:id" element={<ObjectDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Registered Gadget')).toBeDefined();
      expect(screen.getByText('obj-999')).toBeDefined();
    });

    unmount();

    // Test permission denied
    const permissionError = new Error("Missing or insufficient permissions");
    vi.spyOn(objectRepository, 'getObject').mockRejectedValue(permissionError);

    render(
      <MemoryRouter initialEntries={["/object/obj-locked"]}>
        <Routes>
          <Route path="/object/:id" element={<ObjectDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('This Object is not available.')).toBeDefined();
    });

    cleanup();

    // Test not found
    vi.spyOn(objectRepository, 'getObject').mockResolvedValue(null);

    render(
      <MemoryRouter initialEntries={["/object/obj-none"]}>
        <Routes>
          <Route path="/object/:id" element={<ObjectDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Object Not Found')).toBeDefined();
    });
  });
});

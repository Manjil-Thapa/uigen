import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Hoist mock factories so they can be referenced in vi.mock calls
const { mockPush } = vi.hoisted(() => ({
  mockPush: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { useAuth } from "@/hooks/use-auth";
import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

const mockSignInAction = vi.mocked(signInAction);
const mockSignUpAction = vi.mocked(signUpAction);
const mockGetAnonWorkData = vi.mocked(getAnonWorkData);
const mockClearAnonWork = vi.mocked(clearAnonWork);
const mockGetProjects = vi.mocked(getProjects);
const mockCreateProject = vi.mocked(createProject);

const MOCK_PROJECT = {
  id: "project-123",
  name: "Test Project",
  userId: "user-1",
  messages: "[]",
  data: "{}",
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue(MOCK_PROJECT);
});

// ─── Initial state ────────────────────────────────────────────────────────────

describe("initial state", () => {
  test("isLoading starts as false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });

  test("exposes signIn and signUp functions", () => {
    const { result } = renderHook(() => useAuth());
    expect(typeof result.current.signIn).toBe("function");
    expect(typeof result.current.signUp).toBe("function");
  });
});

// ─── signIn ───────────────────────────────────────────────────────────────────

describe("signIn", () => {
  test("returns the result from the action on success", async () => {
    mockSignInAction.mockResolvedValue({ success: true });
    mockCreateProject.mockResolvedValue(MOCK_PROJECT);

    const { result } = renderHook(() => useAuth());
    let returnValue: any;

    await act(async () => {
      returnValue = await result.current.signIn("user@example.com", "password");
    });

    expect(returnValue).toEqual({ success: true });
  });

  test("returns the error result from the action on failure", async () => {
    mockSignInAction.mockResolvedValue({
      success: false,
      error: "Invalid credentials",
    });

    const { result } = renderHook(() => useAuth());
    let returnValue: any;

    await act(async () => {
      returnValue = await result.current.signIn("user@example.com", "wrong");
    });

    expect(returnValue).toEqual({
      success: false,
      error: "Invalid credentials",
    });
  });

  test("sets isLoading to true during execution and resets to false after", async () => {
    let resolve!: (val: any) => void;
    mockSignInAction.mockReturnValue(new Promise((r) => (resolve = r)));

    const { result } = renderHook(() => useAuth());

    let pending: Promise<any>;
    act(() => {
      pending = result.current.signIn("user@example.com", "password");
    });

    // isLoading is true while the action is in-flight
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolve({ success: true });
      await pending;
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("resets isLoading to false even when the action throws", async () => {
    mockSignInAction.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      try {
        await result.current.signIn("user@example.com", "password");
      } catch {
        // expected
      }
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("calls the action with the supplied email and password", async () => {
    mockSignInAction.mockResolvedValue({ success: false });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("alice@example.com", "s3cur3!");
    });

    expect(mockSignInAction).toHaveBeenCalledWith("alice@example.com", "s3cur3!");
  });

  test("does not run post-sign-in logic when the action fails", async () => {
    mockSignInAction.mockResolvedValue({
      success: false,
      error: "Invalid credentials",
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "wrong");
    });

    expect(mockGetAnonWorkData).not.toHaveBeenCalled();
    expect(mockGetProjects).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});

// ─── signUp ───────────────────────────────────────────────────────────────────

describe("signUp", () => {
  test("returns the result from the action on success", async () => {
    mockSignUpAction.mockResolvedValue({ success: true });
    mockCreateProject.mockResolvedValue(MOCK_PROJECT);

    const { result } = renderHook(() => useAuth());
    let returnValue: any;

    await act(async () => {
      returnValue = await result.current.signUp("new@example.com", "password123");
    });

    expect(returnValue).toEqual({ success: true });
  });

  test("returns the error result from the action on failure", async () => {
    mockSignUpAction.mockResolvedValue({
      success: false,
      error: "Email already registered",
    });

    const { result } = renderHook(() => useAuth());
    let returnValue: any;

    await act(async () => {
      returnValue = await result.current.signUp(
        "existing@example.com",
        "password123"
      );
    });

    expect(returnValue).toEqual({
      success: false,
      error: "Email already registered",
    });
  });

  test("sets isLoading to true during execution and resets to false after", async () => {
    let resolve!: (val: any) => void;
    mockSignUpAction.mockReturnValue(new Promise((r) => (resolve = r)));

    const { result } = renderHook(() => useAuth());

    let pending: Promise<any>;
    act(() => {
      pending = result.current.signUp("new@example.com", "password123");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolve({ success: true });
      await pending;
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("resets isLoading to false even when the action throws", async () => {
    mockSignUpAction.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      try {
        await result.current.signUp("new@example.com", "password123");
      } catch {
        // expected
      }
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("does not run post-sign-in logic when the action fails", async () => {
    mockSignUpAction.mockResolvedValue({
      success: false,
      error: "Email already registered",
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("existing@example.com", "password123");
    });

    expect(mockGetAnonWorkData).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});

// ─── Post-sign-in: anonymous work with messages ───────────────────────────────

describe("post sign-in: anonymous work with messages", () => {
  test("creates a project from anon work and redirects to it", async () => {
    const anonWork = {
      messages: [{ role: "user", content: "Build a counter" }],
      fileSystemData: { "/": { type: "directory" } },
    };
    mockSignInAction.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue(anonWork);
    mockCreateProject.mockResolvedValue({ ...MOCK_PROJECT, id: "anon-proj" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password");
    });

    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: anonWork.messages,
        data: anonWork.fileSystemData,
      })
    );
    expect(mockPush).toHaveBeenCalledWith("/anon-proj");
  });

  test("clears anonymous work after creating the project", async () => {
    const anonWork = {
      messages: [{ role: "user", content: "Build a form" }],
      fileSystemData: {},
    };
    mockSignInAction.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue(anonWork);
    mockCreateProject.mockResolvedValue(MOCK_PROJECT);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password");
    });

    expect(mockClearAnonWork).toHaveBeenCalledOnce();
  });

  test("does not call getProjects when anon work has messages", async () => {
    const anonWork = {
      messages: [{ role: "user", content: "Build a card" }],
      fileSystemData: {},
    };
    mockSignInAction.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue(anonWork);
    mockCreateProject.mockResolvedValue(MOCK_PROJECT);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password");
    });

    expect(mockGetProjects).not.toHaveBeenCalled();
  });

  test("includes a time-based name in the created project", async () => {
    const anonWork = {
      messages: [{ role: "user", content: "Hello" }],
      fileSystemData: {},
    };
    mockSignInAction.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue(anonWork);
    mockCreateProject.mockResolvedValue(MOCK_PROJECT);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password");
    });

    const [call] = mockCreateProject.mock.calls;
    expect(call[0].name).toMatch(/^Design from /);
  });
});

// ─── Post-sign-in: anon work present but messages array is empty ──────────────

describe("post sign-in: anonymous work with empty messages", () => {
  test("falls through to existing-projects path when messages is empty", async () => {
    mockSignInAction.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
    mockGetProjects.mockResolvedValue([
      { ...MOCK_PROJECT, id: "existing-proj" },
    ] as any);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password");
    });

    expect(mockCreateProject).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/existing-proj");
  });
});

// ─── Post-sign-in: no anon work, user has existing projects ──────────────────

describe("post sign-in: no anon work, existing projects", () => {
  test("redirects to the most recent project (index 0)", async () => {
    mockSignInAction.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([
      { ...MOCK_PROJECT, id: "recent-proj" },
      { ...MOCK_PROJECT, id: "older-proj" },
    ] as any);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password");
    });

    expect(mockPush).toHaveBeenCalledWith("/recent-proj");
    expect(mockCreateProject).not.toHaveBeenCalled();
  });

  test("works for signUp as well", async () => {
    mockSignUpAction.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([
      { ...MOCK_PROJECT, id: "recent-proj" },
    ] as any);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("new@example.com", "password123");
    });

    expect(mockPush).toHaveBeenCalledWith("/recent-proj");
  });
});

// ─── Post-sign-in: no anon work, no existing projects ────────────────────────

describe("post sign-in: no anon work, no existing projects", () => {
  test("creates a new blank project and redirects to it", async () => {
    mockSignInAction.mockResolvedValue({ success: true });
    mockCreateProject.mockResolvedValue({ ...MOCK_PROJECT, id: "new-proj" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password");
    });

    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({ messages: [], data: {} })
    );
    expect(mockPush).toHaveBeenCalledWith("/new-proj");
  });

  test("new project name follows the 'New Design #...' pattern", async () => {
    mockSignInAction.mockResolvedValue({ success: true });
    mockCreateProject.mockResolvedValue(MOCK_PROJECT);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password");
    });

    const [call] = mockCreateProject.mock.calls;
    expect(call[0].name).toMatch(/^New Design #\d+$/);
  });

  test("works for signUp as well", async () => {
    mockSignUpAction.mockResolvedValue({ success: true });
    mockCreateProject.mockResolvedValue({ ...MOCK_PROJECT, id: "new-proj" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("new@example.com", "password123");
    });

    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({ messages: [], data: {} })
    );
    expect(mockPush).toHaveBeenCalledWith("/new-proj");
  });
});

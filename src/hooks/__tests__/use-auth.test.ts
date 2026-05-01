import { test, expect, describe, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
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

describe("useAuth", () => {
  let mockPush: ReturnType<typeof vi.fn>;
  let mockSignIn: ReturnType<typeof vi.fn>;
  let mockSignUp: ReturnType<typeof vi.fn>;
  let mockGetAnonWorkData: ReturnType<typeof vi.fn>;
  let mockClearAnonWork: ReturnType<typeof vi.fn>;
  let mockGetProjects: ReturnType<typeof vi.fn>;
  let mockCreateProject: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockPush = vi.fn();

    const { useRouter } = await import("next/navigation");
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
    } as any);

    const { signIn, signUp } = await import("@/actions");
    mockSignIn = vi.mocked(signIn);
    mockSignUp = vi.mocked(signUp);

    const { getAnonWorkData, clearAnonWork } = await import(
      "@/lib/anon-work-tracker"
    );
    mockGetAnonWorkData = vi.mocked(getAnonWorkData);
    mockClearAnonWork = vi.mocked(clearAnonWork);

    const { getProjects } = await import("@/actions/get-projects");
    mockGetProjects = vi.mocked(getProjects);

    const { createProject } = await import("@/actions/create-project");
    mockCreateProject = vi.mocked(createProject);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    test("returns signIn, signUp functions and isLoading false", () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.signIn).toBeTypeOf("function");
      expect(result.current.signUp).toBeTypeOf("function");
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("signIn", () => {
    test("calls signInAction with provided credentials", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "new-project-123" });

      const { result } = renderHook(() => useAuth());

      await result.current.signIn("test@example.com", "password123");

      expect(mockSignIn).toHaveBeenCalledWith("test@example.com", "password123");
    });

    test("sets isLoading to true during sign in", async () => {
      mockSignIn.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ success: true }), 100);
          })
      );
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "project-123" });

      const { result } = renderHook(() => useAuth());

      const signInPromise = result.current.signIn(
        "test@example.com",
        "password123"
      );
      expect(result.current.isLoading).toBe(true);

      await signInPromise;
    });

    test("sets isLoading to false after successful sign in", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "project-123" });

      const { result } = renderHook(() => useAuth());

      await result.current.signIn("test@example.com", "password123");

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    test("sets isLoading to false after failed sign in", async () => {
      mockSignIn.mockResolvedValue({
        success: false,
        error: "Invalid credentials",
      });

      const { result } = renderHook(() => useAuth());

      await result.current.signIn("test@example.com", "wrongpassword");

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    test("returns error result on failed sign in", async () => {
      mockSignIn.mockResolvedValue({
        success: false,
        error: "Invalid credentials",
      });

      const { result } = renderHook(() => useAuth());

      const authResult = await result.current.signIn(
        "test@example.com",
        "wrongpassword"
      );

      expect(authResult.success).toBe(false);
      expect(authResult.error).toBe("Invalid credentials");
    });

    test("does not redirect on failed sign in", async () => {
      mockSignIn.mockResolvedValue({
        success: false,
        error: "Invalid credentials",
      });

      const { result } = renderHook(() => useAuth());

      await result.current.signIn("test@example.com", "wrongpassword");

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("signUp", () => {
    test("calls signUpAction with provided credentials", async () => {
      mockSignUp.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "new-project-123" });

      const { result } = renderHook(() => useAuth());

      await result.current.signUp("test@example.com", "password123");

      expect(mockSignUp).toHaveBeenCalledWith("test@example.com", "password123");
    });

    test("sets isLoading to true during sign up", async () => {
      mockSignUp.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ success: true }), 100);
          })
      );
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "project-123" });

      const { result } = renderHook(() => useAuth());

      const signUpPromise = result.current.signUp(
        "test@example.com",
        "password123"
      );
      expect(result.current.isLoading).toBe(true);

      await signUpPromise;
    });

    test("sets isLoading to false after successful sign up", async () => {
      mockSignUp.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "project-123" });

      const { result } = renderHook(() => useAuth());

      await result.current.signUp("test@example.com", "password123");

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    test("sets isLoading to false after failed sign up", async () => {
      mockSignUp.mockResolvedValue({
        success: false,
        error: "Email already registered",
      });

      const { result } = renderHook(() => useAuth());

      await result.current.signUp("test@example.com", "password123");

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    test("returns error result on failed sign up", async () => {
      mockSignUp.mockResolvedValue({
        success: false,
        error: "Email already registered",
      });

      const { result } = renderHook(() => useAuth());

      const authResult = await result.current.signUp(
        "test@example.com",
        "password123"
      );

      expect(authResult.success).toBe(false);
      expect(authResult.error).toBe("Email already registered");
    });

    test("does not redirect on failed sign up", async () => {
      mockSignUp.mockResolvedValue({
        success: false,
        error: "Email already registered",
      });

      const { result } = renderHook(() => useAuth());

      await result.current.signUp("test@example.com", "password123");

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("handlePostSignIn - with anonymous work", () => {
    test("creates project with anonymous work and redirects to it", async () => {
      const anonWork = {
        messages: [{ role: "user", content: "Create a button" }],
        fileSystemData: { "/": {}, "/App.jsx": { content: "code" } },
      };
      const createdProject = { id: "anon-project-123" };

      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWork);
      mockCreateProject.mockResolvedValue(createdProject);

      const { result } = renderHook(() => useAuth());

      await result.current.signIn("test@example.com", "password123");

      await waitFor(() => {
        expect(mockCreateProject).toHaveBeenCalledWith({
          name: expect.stringMatching(/^Design from \d+:\d+:\d+/),
          messages: anonWork.messages,
          data: anonWork.fileSystemData,
        });
        expect(mockClearAnonWork).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/anon-project-123");
      });
    });

    test("does not check for existing projects when anonymous work exists", async () => {
      const anonWork = {
        messages: [{ role: "user", content: "Create a button" }],
        fileSystemData: { "/": {} },
      };

      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWork);
      mockCreateProject.mockResolvedValue({ id: "project-123" });

      const { result } = renderHook(() => useAuth());

      await result.current.signIn("test@example.com", "password123");

      await waitFor(() => {
        expect(mockGetProjects).not.toHaveBeenCalled();
      });
    });

    test("clears anonymous work after creating project", async () => {
      const anonWork = {
        messages: [{ role: "user", content: "Hello" }],
        fileSystemData: {},
      };

      mockSignUp.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWork);
      mockCreateProject.mockResolvedValue({ id: "project-123" });

      const { result } = renderHook(() => useAuth());

      await result.current.signUp("test@example.com", "password123");

      await waitFor(() => {
        expect(mockClearAnonWork).toHaveBeenCalled();
      });
    });

    test("skips anonymous work if messages are empty", async () => {
      const anonWork = {
        messages: [],
        fileSystemData: {},
      };

      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWork);
      mockGetProjects.mockResolvedValue([{ id: "existing-project-456" }]);

      const { result } = renderHook(() => useAuth());

      await result.current.signIn("test@example.com", "password123");

      await waitFor(() => {
        expect(mockCreateProject).not.toHaveBeenCalledWith(
          expect.objectContaining({ messages: [] })
        );
        expect(mockClearAnonWork).not.toHaveBeenCalled();
        expect(mockGetProjects).toHaveBeenCalled();
      });
    });
  });

  describe("handlePostSignIn - with existing projects", () => {
    test("redirects to most recent project when projects exist", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([
        { id: "project-1", name: "Project 1" },
        { id: "project-2", name: "Project 2" },
      ]);

      const { result } = renderHook(() => useAuth());

      await result.current.signIn("test@example.com", "password123");

      await waitFor(() => {
        expect(mockGetProjects).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/project-1");
      });
    });

    test("does not create new project when existing projects found", async () => {
      mockSignUp.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([{ id: "project-1" }]);

      const { result } = renderHook(() => useAuth());

      await result.current.signUp("test@example.com", "password123");

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/project-1");
      });

      expect(mockCreateProject).not.toHaveBeenCalled();
    });
  });

  describe("handlePostSignIn - no anonymous work, no existing projects", () => {
    test("creates new empty project and redirects to it", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "new-empty-project-789" });

      const { result } = renderHook(() => useAuth());

      await result.current.signIn("test@example.com", "password123");

      await waitFor(() => {
        expect(mockGetProjects).toHaveBeenCalled();
        expect(mockCreateProject).toHaveBeenCalledWith({
          name: expect.stringMatching(/^New Design #\d+$/),
          messages: [],
          data: {},
        });
        expect(mockPush).toHaveBeenCalledWith("/new-empty-project-789");
      });
    });

    test("generates random project name for new empty project", async () => {
      mockSignUp.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "project-123" });

      const { result } = renderHook(() => useAuth());

      await result.current.signUp("test@example.com", "password123");

      await waitFor(() => {
        expect(mockCreateProject).toHaveBeenCalledWith(
          expect.objectContaining({
            name: expect.stringMatching(/^New Design #\d+$/),
          })
        );
      });
    });
  });

  describe("error handling", () => {
    test("sets isLoading to false even if signIn throws error", async () => {
      mockSignIn.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await expect(
        result.current.signIn("test@example.com", "password123")
      ).rejects.toThrow("Network error");

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    test("sets isLoading to false even if signUp throws error", async () => {
      mockSignUp.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await expect(
        result.current.signUp("test@example.com", "password123")
      ).rejects.toThrow("Network error");

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    test("propagates errors from createProject", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockRejectedValue(new Error("Database error"));

      const { result } = renderHook(() => useAuth());

      await expect(
        result.current.signIn("test@example.com", "password123")
      ).rejects.toThrow("Database error");

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    test("propagates errors from getProjects", async () => {
      mockSignUp.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockRejectedValue(new Error("Database error"));

      const { result } = renderHook(() => useAuth());

      await expect(
        result.current.signUp("test@example.com", "password123")
      ).rejects.toThrow("Database error");

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe("integration scenarios", () => {
    test("complete sign up flow: new user with anonymous work", async () => {
      const anonWork = {
        messages: [{ role: "user", content: "Create counter" }],
        fileSystemData: { "/": {}, "/Counter.jsx": { content: "code" } },
      };

      mockSignUp.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWork);
      mockCreateProject.mockResolvedValue({ id: "first-project" });

      const { result } = renderHook(() => useAuth());

      const authResult = await result.current.signUp(
        "newuser@example.com",
        "password123"
      );

      expect(authResult.success).toBe(true);
      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.any(String),
        messages: anonWork.messages,
        data: anonWork.fileSystemData,
      });
      expect(mockClearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/first-project");
    });

    test("complete sign in flow: returning user with projects", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([
        { id: "latest-project", name: "My Latest Work" },
        { id: "old-project", name: "Old Work" },
      ]);

      const { result } = renderHook(() => useAuth());

      const authResult = await result.current.signIn(
        "existing@example.com",
        "password123"
      );

      expect(authResult.success).toBe(true);
      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/latest-project");
      expect(mockCreateProject).not.toHaveBeenCalled();
    });

    test("multiple consecutive sign in attempts", async () => {
      mockSignIn
        .mockResolvedValueOnce({ success: false, error: "Invalid credentials" })
        .mockResolvedValueOnce({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([{ id: "project-1" }]);

      const { result } = renderHook(() => useAuth());

      const firstAttempt = await result.current.signIn(
        "user@example.com",
        "wrongpassword"
      );
      expect(firstAttempt.success).toBe(false);
      expect(mockPush).not.toHaveBeenCalled();

      const secondAttempt = await result.current.signIn(
        "user@example.com",
        "correctpassword"
      );
      expect(secondAttempt.success).toBe(true);
      expect(mockPush).toHaveBeenCalledWith("/project-1");
    });
  });
});

import { test, expect, describe, vi, beforeEach, afterEach } from "vitest";
import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "development-secret-key"
);
const COOKIE_NAME = "auth-token";

vi.mock("server-only", () => ({}));

describe("auth module", () => {
  let mockCookies: Map<string, any>;
  let createSessionFn: (userId: string, email: string) => Promise<void>;
  let getSessionFn: () => Promise<any>;
  let deleteSessionFn: () => Promise<void>;
  let verifySessionFn: (request: NextRequest) => Promise<any>;

  beforeEach(async () => {
    mockCookies = new Map();

    vi.doMock("next/headers", () => ({
      cookies: vi.fn(async () => ({
        get: (name: string) => mockCookies.get(name),
        set: (name: string, value: string, options?: any) => {
          mockCookies.set(name, { value, ...options });
        },
        delete: (name: string) => {
          mockCookies.delete(name);
        },
      })),
    }));

    const authModule = await import("@/lib/auth");
    createSessionFn = authModule.createSession;
    getSessionFn = authModule.getSession;
    deleteSessionFn = authModule.deleteSession;
    verifySessionFn = authModule.verifySession;
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe("createSession", () => {
    test("creates a valid JWT token and sets cookie", async () => {
      const userId = "user123";
      const email = "test@example.com";

      await createSessionFn(userId, email);

      const cookie = mockCookies.get(COOKIE_NAME);
      expect(cookie).toBeDefined();
      expect(cookie.value).toBeTruthy();

      const { payload } = await jwtVerify(cookie.value, JWT_SECRET);
      expect(payload.userId).toBe(userId);
      expect(payload.email).toBe(email);
      expect(payload.expiresAt).toBeDefined();
    });

    test("sets cookie with correct security options", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      await createSessionFn("user123", "test@example.com");

      const cookie = mockCookies.get(COOKIE_NAME);
      expect(cookie.httpOnly).toBe(true);
      expect(cookie.secure).toBe(true);
      expect(cookie.sameSite).toBe("lax");
      expect(cookie.path).toBe("/");
      expect(cookie.expires).toBeInstanceOf(Date);

      process.env.NODE_ENV = originalEnv;
    });

    test("sets expiration to 7 days from now", async () => {
      const beforeCreate = Date.now();
      await createSessionFn("user123", "test@example.com");
      const afterCreate = Date.now();

      const cookie = mockCookies.get(COOKIE_NAME);
      const { payload } = await jwtVerify(cookie.value, JWT_SECRET);

      const expiresAt = new Date(payload.expiresAt as string).getTime();
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

      expect(expiresAt).toBeGreaterThanOrEqual(beforeCreate + sevenDaysInMs);
      expect(expiresAt).toBeLessThanOrEqual(afterCreate + sevenDaysInMs + 1000);
    });

    test("includes required JWT claims", async () => {
      await createSessionFn("user123", "test@example.com");

      const cookie = mockCookies.get(COOKIE_NAME);
      const { payload, protectedHeader } = await jwtVerify(
        cookie.value,
        JWT_SECRET
      );

      expect(protectedHeader.alg).toBe("HS256");
      expect(payload.exp).toBeDefined();
      expect(payload.iat).toBeDefined();
    });
  });

  describe("getSession", () => {
    test("returns session data for valid token", async () => {
      const userId = "user123";
      const email = "test@example.com";

      await createSessionFn(userId, email);
      const session = await getSessionFn();

      expect(session).toBeDefined();
      expect(session?.userId).toBe(userId);
      expect(session?.email).toBe(email);
      expect(session?.expiresAt).toBeDefined();
    });

    test("returns null when no token exists", async () => {
      const session = await getSessionFn();
      expect(session).toBeNull();
    });

    test("returns null for invalid token", async () => {
      mockCookies.set(COOKIE_NAME, { value: "invalid-token" });
      const session = await getSessionFn();
      expect(session).toBeNull();
    });

    test("returns null for expired token", async () => {
      const expiredToken = await new SignJWT({
        userId: "user123",
        email: "test@example.com",
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("1s")
        .setIssuedAt(Math.floor(Date.now() / 1000) - 2)
        .sign(JWT_SECRET);

      mockCookies.set(COOKIE_NAME, { value: expiredToken });

      const session = await getSessionFn();
      expect(session).toBeNull();
    });

    test("returns null for token with wrong signature", async () => {
      const wrongSecret = new TextEncoder().encode("wrong-secret");
      const invalidToken = await new SignJWT({
        userId: "user123",
        email: "test@example.com",
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("1d")
        .setIssuedAt()
        .sign(wrongSecret);

      mockCookies.set(COOKIE_NAME, { value: invalidToken });

      const session = await getSessionFn();
      expect(session).toBeNull();
    });
  });

  describe("deleteSession", () => {
    test("removes the auth cookie", async () => {
      await createSessionFn("user123", "test@example.com");
      expect(mockCookies.has(COOKIE_NAME)).toBe(true);

      await deleteSessionFn();
      expect(mockCookies.has(COOKIE_NAME)).toBe(false);
    });

    test("works when no session exists", async () => {
      expect(mockCookies.has(COOKIE_NAME)).toBe(false);
      await expect(deleteSessionFn()).resolves.not.toThrow();
    });
  });

  describe("verifySession", () => {
    test("returns session data for valid token in request", async () => {
      const userId = "user123";
      const email = "test@example.com";
      const expiresAt = new Date(Date.now() + 86400000).toISOString();

      const token = await new SignJWT({ userId, email, expiresAt })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("1d")
        .setIssuedAt()
        .sign(JWT_SECRET);

      const mockRequest = {
        cookies: {
          get: (name: string) => (name === COOKIE_NAME ? { value: token } : undefined),
        },
      } as NextRequest;

      const session = await verifySessionFn(mockRequest);

      expect(session).toBeDefined();
      expect(session?.userId).toBe(userId);
      expect(session?.email).toBe(email);
    });

    test("returns null when no token in request", async () => {
      const mockRequest = {
        cookies: {
          get: () => undefined,
        },
      } as NextRequest;

      const session = await verifySessionFn(mockRequest);
      expect(session).toBeNull();
    });

    test("returns null for invalid token in request", async () => {
      const mockRequest = {
        cookies: {
          get: (name: string) =>
            name === COOKIE_NAME ? { value: "invalid-token" } : undefined,
        },
      } as NextRequest;

      const session = await verifySessionFn(mockRequest);
      expect(session).toBeNull();
    });

    test("returns null for expired token in request", async () => {
      const expiredToken = await new SignJWT({
        userId: "user123",
        email: "test@example.com",
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("1s")
        .setIssuedAt(Math.floor(Date.now() / 1000) - 2)
        .sign(JWT_SECRET);

      const mockRequest = {
        cookies: {
          get: (name: string) =>
            name === COOKIE_NAME ? { value: expiredToken } : undefined,
        },
      } as NextRequest;

      const session = await verifySessionFn(mockRequest);
      expect(session).toBeNull();
    });

    test("returns null for token with wrong signature in request", async () => {
      const wrongSecret = new TextEncoder().encode("wrong-secret");
      const invalidToken = await new SignJWT({
        userId: "user123",
        email: "test@example.com",
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("1d")
        .setIssuedAt()
        .sign(wrongSecret);

      const mockRequest = {
        cookies: {
          get: (name: string) =>
            name === COOKIE_NAME ? { value: invalidToken } : undefined,
        },
      } as NextRequest;

      const session = await verifySessionFn(mockRequest);
      expect(session).toBeNull();
    });
  });

  describe("SessionPayload interface", () => {
    test("session contains all required fields", async () => {
      await createSessionFn("user123", "test@example.com");
      const session = await getSessionFn();

      expect(session).toHaveProperty("userId");
      expect(session).toHaveProperty("email");
      expect(session).toHaveProperty("expiresAt");

      expect(typeof session?.userId).toBe("string");
      expect(typeof session?.email).toBe("string");
    });
  });

  describe("integration scenarios", () => {
    test("complete auth flow: create, verify, delete", async () => {
      const userId = "user123";
      const email = "test@example.com";

      await createSessionFn(userId, email);
      let session = await getSessionFn();
      expect(session?.userId).toBe(userId);

      await deleteSessionFn();
      session = await getSessionFn();
      expect(session).toBeNull();
    });

    test("multiple sessions overwrite previous ones", async () => {
      await createSessionFn("user1", "user1@example.com");
      await createSessionFn("user2", "user2@example.com");

      const session = await getSessionFn();
      expect(session?.userId).toBe("user2");
      expect(session?.email).toBe("user2@example.com");
    });
  });
});

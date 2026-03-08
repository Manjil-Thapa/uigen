// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";

const { mockSet, mockGet, mockDelete } = vi.hoisted(() => ({
  mockSet: vi.fn(),
  mockGet: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({ set: mockSet, get: mockGet, delete: mockDelete })
  ),
}));

import { SignJWT } from "jose";
import { createSession, getSession } from "@/lib/auth";

const TEST_SECRET = new TextEncoder().encode("development-secret-key");

async function createTestToken(
  payload: Record<string, unknown>,
  expiresIn = "7d"
) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(TEST_SECRET);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getSession", () => {
  test("returns null when no cookie is present", async () => {
    mockGet.mockReturnValue(undefined);

    const session = await getSession();
    expect(session).toBeNull();
  });

  test("returns the session payload for a valid token", async () => {
    const token = await createTestToken({
      userId: "user-123",
      email: "test@example.com",
    });
    mockGet.mockReturnValue({ value: token });

    const session = await getSession();

    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user-123");
    expect(session?.email).toBe("test@example.com");
  });

  test("returns null for an expired token", async () => {
    const token = await createTestToken(
      { userId: "user-123", email: "test@example.com" },
      "-1s"
    );
    mockGet.mockReturnValue({ value: token });

    const session = await getSession();
    expect(session).toBeNull();
  });

  test("returns null for a tampered token", async () => {
    const token = await createTestToken({
      userId: "user-123",
      email: "test@example.com",
    });
    const tampered = token.slice(0, -5) + "XXXXX";
    mockGet.mockReturnValue({ value: tampered });

    const session = await getSession();
    expect(session).toBeNull();
  });

  test("returns null for a malformed token string", async () => {
    mockGet.mockReturnValue({ value: "not.a.valid.jwt" });

    const session = await getSession();
    expect(session).toBeNull();
  });
});

describe("createSession", () => {
  test("sets a cookie named auth-token", async () => {
    await createSession("user-123", "test@example.com");

    expect(mockSet).toHaveBeenCalledOnce();
    const [cookieName] = mockSet.mock.calls[0];
    expect(cookieName).toBe("auth-token");
  });

  test("cookie has correct security options", async () => {
    await createSession("user-123", "test@example.com");

    const [, , options] = mockSet.mock.calls[0];
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });

  test("cookie expires in approximately 7 days", async () => {
    const before = Date.now();
    await createSession("user-123", "test@example.com");
    const after = Date.now();

    const [, , options] = mockSet.mock.calls[0];
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    expect(options.expires.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(options.expires.getTime()).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });

  test("stores a valid JWT (header.payload.signature format)", async () => {
    await createSession("user-123", "test@example.com");

    const [, token] = mockSet.mock.calls[0];
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });

  test("works with different userId and email values", async () => {
    await createSession("abc-456", "another@example.com");

    expect(mockSet).toHaveBeenCalledOnce();
    const [cookieName, token] = mockSet.mock.calls[0];
    expect(cookieName).toBe("auth-token");
    expect(token.split(".")).toHaveLength(3);
  });
});

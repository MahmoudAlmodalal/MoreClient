import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"

const replace = vi.fn()
const ORIG_LOCATION = window.location

beforeEach(() => {
  replace.mockReset()
  // jsdom locks `window.location`; redefining with `configurable: true` is
  // the supported way to spy on `replace()`.
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      ...ORIG_LOCATION,
      pathname: "/dashboard",
      origin: "http://localhost",
      replace,
    },
  })
  window.localStorage.clear()
  window.sessionStorage.clear()
  vi.resetModules()
})

afterEach(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: ORIG_LOCATION,
  })
})

function mockFetchOnce(status: number, body: unknown = { detail: "nope" }) {
  return vi.spyOn(global, "fetch" as never).mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }) as never,
  )
}

describe("apiGet 401 handling (bug #3 regression)", () => {
  it("redirects to /welcome and throws Unauthorized instead of the parsed body error", async () => {
    const api = await import("@/lib/api")
    window.localStorage.setItem(api.JWT_TOKEN_STORAGE, "stale-token")
    mockFetchOnce(401, { detail: "Token expired" })

    await expect(api.apiGet("/api/settings")).rejects.toThrow("Unauthorized")
    expect(replace).toHaveBeenCalledTimes(1)
    expect(replace).toHaveBeenCalledWith(expect.stringMatching(/\/welcome$/))
    // Token must be cleared so a subsequent request doesn't reuse it.
    expect(window.localStorage.getItem(api.JWT_TOKEN_STORAGE)).toBeNull()
  })

  it("does not double-redirect when two concurrent requests both 401", async () => {
    const api = await import("@/lib/api")
    window.localStorage.setItem(api.JWT_TOKEN_STORAGE, "stale-token")
    const spy = vi.spyOn(global, "fetch" as never)
    spy.mockResolvedValue(
      new Response(JSON.stringify({ detail: "nope" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }) as never,
    )

    const a = api.apiGet("/api/settings").catch((e: Error) => e.message)
    const b = api.apiGet("/api/files").catch((e: Error) => e.message)
    const [ra, rb] = await Promise.all([a, b])

    expect(ra).toBe("Unauthorized")
    expect(rb).toBe("Unauthorized")
    expect(replace).toHaveBeenCalledTimes(1)
  })
})

describe("apiGet admin 401 handling", () => {
  it("clears the admin key without navigating", async () => {
    const api = await import("@/lib/api")
    api.setAdminKey("super-secret")
    expect(api.hasAdminKey()).toBe(true)
    mockFetchOnce(401)

    await expect(api.apiGet("/api/admin/tenants")).rejects.toThrow("Unauthorized")
    expect(replace).not.toHaveBeenCalled()
    expect(api.hasAdminKey()).toBe(false)
  })
})

describe("createAuthenticatedWebSocketUrl", () => {
  it("appends token from localStorage when present", async () => {
    const api = await import("@/lib/api")
    window.localStorage.setItem(api.JWT_TOKEN_STORAGE, "jwt-abc")
    const url = api.createAuthenticatedWebSocketUrl("/ws/dashboard")
    expect(url).toContain("token=jwt-abc")
  })

  it("leaves the URL unchanged when there is no token", async () => {
    const api = await import("@/lib/api")
    const url = api.createAuthenticatedWebSocketUrl("/ws/dashboard")
    expect(url).not.toContain("token=")
  })
})

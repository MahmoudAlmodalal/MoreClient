import { describe, it, expect, beforeEach, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useIsMobile } from "@/hooks/use-mobile"

function mockMatchMedia(matches: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = []
  const mql = {
    matches,
    addEventListener: vi.fn((_: string, cb: (e: MediaQueryListEvent) => void) => {
      listeners.push(cb)
    }),
    removeEventListener: vi.fn((_: string, cb: (e: MediaQueryListEvent) => void) => {
      const idx = listeners.indexOf(cb)
      if (idx > -1) listeners.splice(idx, 1)
    }),
  }
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockReturnValue(mql),
  })
  return { mql, listeners }
}

describe("useIsMobile", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("returns true when window.innerWidth is below 768", () => {
    mockMatchMedia(true)
    Object.defineProperty(window, "innerWidth", { writable: true, value: 480 })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it("returns false when window.innerWidth is 768 or above", () => {
    mockMatchMedia(false)
    Object.defineProperty(window, "innerWidth", { writable: true, value: 1024 })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it("responds to matchMedia change events", () => {
    const { listeners } = mockMatchMedia(false)
    Object.defineProperty(window, "innerWidth", { writable: true, value: 1024 })
    const { result } = renderHook(() => useIsMobile())

    act(() => {
      Object.defineProperty(window, "innerWidth", { writable: true, value: 400 })
      listeners.forEach((fn) => fn({} as MediaQueryListEvent))
    })

    expect(result.current).toBe(true)
  })
})

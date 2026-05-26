import { describe, it, expect } from "vitest"
import { cn } from "@/lib/utils"

describe("cn utility", () => {
  it("merges class strings", () => {
    expect(cn("foo", "bar")).toBe("foo bar")
  })

  it("handles conditional objects", () => {
    expect(cn({ foo: true, bar: false })).toBe("foo")
  })

  it("filters falsy values", () => {
    expect(cn("a", undefined, null, false, "b")).toBe("a b")
  })

  it("resolves tailwind conflicting classes (last wins)", () => {
    const result = cn("p-2", "p-4")
    expect(result).toBe("p-4")
  })

  it("resolves conflicting text colors", () => {
    const result = cn("text-red-500", "text-blue-500")
    expect(result).toBe("text-blue-500")
  })

  it("combines array inputs", () => {
    expect(cn(["a", "b"], "c")).toBe("a b c")
  })

  it("returns empty string for no input", () => {
    expect(cn()).toBe("")
  })
})

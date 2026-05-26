import { describe, it, expect } from "vitest"
import { reducer } from "@/hooks/use-toast"

const emptyState = { toasts: [] }

function makeToast(id: string, open = true) {
  return { id, title: "Test", open } as any
}

describe("toast reducer", () => {
  it("ADD_TOAST appends a toast", () => {
    const toast = makeToast("1")
    const next = reducer(emptyState, { type: "ADD_TOAST", toast })
    expect(next.toasts).toHaveLength(1)
    expect(next.toasts[0].id).toBe("1")
  })

  it("ADD_TOAST respects TOAST_LIMIT of 1 (drops older toasts)", () => {
    const s1 = reducer(emptyState, { type: "ADD_TOAST", toast: makeToast("1") })
    const s2 = reducer(s1, { type: "ADD_TOAST", toast: makeToast("2") })
    expect(s2.toasts).toHaveLength(1)
    expect(s2.toasts[0].id).toBe("2")
  })

  it("UPDATE_TOAST merges fields into existing toast", () => {
    const s = reducer(emptyState, { type: "ADD_TOAST", toast: makeToast("1") })
    const next = reducer(s, {
      type: "UPDATE_TOAST",
      toast: { id: "1", title: "Updated" } as any,
    })
    expect(next.toasts[0].title).toBe("Updated")
    expect(next.toasts[0].open).toBe(true)
  })

  it("UPDATE_TOAST does nothing for unknown id", () => {
    const s = reducer(emptyState, { type: "ADD_TOAST", toast: makeToast("1") })
    const next = reducer(s, {
      type: "UPDATE_TOAST",
      toast: { id: "999", title: "Ghost" } as any,
    })
    expect(next.toasts[0].title).toBe("Test")
  })

  it("DISMISS_TOAST by id sets open=false", () => {
    const s = reducer(emptyState, { type: "ADD_TOAST", toast: makeToast("1") })
    const next = reducer(s, { type: "DISMISS_TOAST", toastId: "1" })
    expect(next.toasts[0].open).toBe(false)
  })

  it("DISMISS_TOAST with no id dismisses all", () => {
    const s0 = reducer(emptyState, { type: "ADD_TOAST", toast: makeToast("1") })
    const next = reducer(s0, { type: "DISMISS_TOAST", toastId: undefined })
    expect(next.toasts.every((t) => t.open === false)).toBe(true)
  })

  it("REMOVE_TOAST by id removes just that toast", () => {
    const s = reducer(emptyState, { type: "ADD_TOAST", toast: makeToast("1") })
    const next = reducer(s, { type: "REMOVE_TOAST", toastId: "1" })
    expect(next.toasts).toHaveLength(0)
  })

  it("REMOVE_TOAST with no id clears all", () => {
    const s = reducer(emptyState, { type: "ADD_TOAST", toast: makeToast("1") })
    const next = reducer(s, { type: "REMOVE_TOAST", toastId: undefined })
    expect(next.toasts).toHaveLength(0)
  })
})

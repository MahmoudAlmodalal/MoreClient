import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"

// Mock all router/context dependencies
vi.mock("@/lib/next-shim/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))
vi.mock("@/lib/next-shim/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [k: string]: unknown }) =>
    <a href={href} {...props}>{children}</a>,
}))
vi.mock("@/components/language-provider", () => ({
  useLanguage: () => ({
    language: "en",
    setLanguage: vi.fn(),
    isRtl: false,
    t: (k: string) => k,
  }),
}))
vi.mock("@/components/login-carousel", () => ({
  LoginCarousel: () => <div data-testid="carousel" />,
}))

describe("LoginView", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders Sign In and Create New Account buttons", async () => {
    const { LoginView } = await import("@/components/login-view")
    render(<LoginView />)
    expect(screen.getByText(/sign in/i)).toBeTruthy()
    expect(screen.getByText(/create new account/i)).toBeTruthy()
  })

  it("renders language toggle button", async () => {
    const { LoginView } = await import("@/components/login-view")
    render(<LoginView />)
    // Language toggle shows the other language name
    expect(screen.getByText(/العربية|English/i)).toBeTruthy()
  })

  it("renders privacy and terms links", async () => {
    const { LoginView } = await import("@/components/login-view")
    render(<LoginView />)
    expect(screen.getByText(/privacy/i)).toBeTruthy()
    expect(screen.getByText(/terms/i)).toBeTruthy()
  })
})

# clientMORE — Design System

The base UI/UX foundation for clientMORE. Tokens live in [`src/app/globals.css`](src/app/globals.css); reusable primitives live in [`src/components/ui/`](src/components/ui/). Build new screens by composing these — don't hand-roll one-off colors or buttons.

## Foundations

### Theme
The product is **dark-first** (`#050508` background). Light surfaces exist only for entry/marketing edges (the welcome right panel, the sign-in fallback card).

### Color tokens
Defined as CSS variables in `:root` and exposed to Tailwind via the `@theme` block, so they're usable as utilities (`bg-brand-500`, `text-brand-300`, `border-border-light`, …).

| Token | Value | Use |
|---|---|---|
| `--background` | `#050508` | App background (dark) |
| `--card-bg` | `#0d0d15` | Cards, panels |
| `--sidebar-bg` / footer | `#07070b` | Sidebar, footer |
| `--border` | `#1f1f2e` | Dark borders |
| `--brand-50…900` | `#f5f3ff … #4c1d95` | Brand purple scale (anchor `--brand-500 #8b5cf6`) |
| `--surface-light` | `#ffffff` | Light panels |
| `--surface-muted` | `#f5f3ff` | Light secondary surface |
| `--foreground-light` | `#1f1430` | Text on light |
| `--border-light` | `#e9e5f5` | Borders on light |

### Radii
`--radius-sm` `.5rem` · `--radius-md` `.75rem` · `--radius-lg` `1rem` · `--radius-xl` `1.5rem` · `--radius-2xl` `2rem`. In practice cards use `rounded-2xl`, buttons/inputs `rounded-xl`.

### Gradient & glow helpers (classes in `globals.css`)
- `.gradient-brand` — brand purple background gradient (CTAs, brand panels, step badges).
- `.text-gradient-brand` — gradient-clipped text (the "MORE" wordmark).
- `.glass` — frosted dark surface. `.glow-purple` — soft purple ambient shadow.
- Shadow tokens: `--shadow-brand`, `--glow-brand`.

### Fonts
`--font-inter` (Latin/LTR) and `--font-cairo` (Arabic/RTL), both loaded in [`src/app/layout.tsx`](src/app/layout.tsx). `globals.css` swaps to Cairo automatically under `html[dir="rtl"]`.

## Components (`src/components/ui/`)

| Component | Key props | Notes |
|---|---|---|
| `Logo` | `variant: "dark"\|"light"\|"mark"`, `size: "sm"\|"md"\|"lg"` | Brand wordmark; smiley SVG replaces the "O" in MORE. Single source of truth for the mark. |
| `Button` | `variant: "primary"\|"secondary"\|"outline"\|"ghost"`, `size`, `href?` | Renders a Next `<Link>` when `href` is set, otherwise a `<button>`. |
| `Card` | `tone: "dark"\|"glass"\|"light"` | Padded rounded surface. |
| `Container` | — | Centered `max-w-6xl` with responsive padding. |
| `Section` / `SectionHeading` | `id`; `eyebrow?`, `title`, `subtitle?` | Page section rhythm + centered heading block. |
| `Badge` | `tone: "brand"\|"neutral"\|"solid"` | Pills (hero eyebrow, "Most popular"). |

### Usage
```tsx
import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/ui/section";

<Section id="pricing">
  <SectionHeading eyebrow="Pricing" title="Simple, transparent pricing" />
  <Button href="/welcome" size="lg">Get started</Button>
</Section>
```

## Internationalization
Bilingual EN/AR with RTL via the hand-rolled provider [`src/components/language-provider.tsx`](src/components/language-provider.tsx). Consume with the `useLanguage()` hook:

```tsx
"use client";
import { useLanguage } from "@/components/language-provider";
const { t, isRtl, language, setLanguage } = useLanguage();
```

**Adding a string:** add the key to BOTH `translationsEn` and `translationsAr` (the AR object is type-checked against EN via `Translations = typeof translationsEn`, so they must stay in sync). Direction (`dir`/font) is applied to `<html>` automatically from `language`.

## Composition examples in the codebase
- Marketing landing — [`src/components/landing/`](src/components/landing/) → assembled in [`src/app/page.tsx`](src/app/page.tsx).
- Welcome / login entry — [`src/app/welcome/page.tsx`](src/app/welcome/page.tsx) (dark brand panel + light actions panel).
- Auth — [`src/components/auth/auth-shell.tsx`](src/components/auth/auth-shell.tsx) wraps Clerk `<SignIn>`/`<SignUp>` with brand theming and a no-Clerk fallback.

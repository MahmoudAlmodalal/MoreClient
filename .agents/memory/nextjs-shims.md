---
name: Next.js shims for Vite
description: clientmore frontend replaced next/* imports with custom shims using wouter
---

# Rule
All `next/link`, `next/navigation`, `next/font/google`, and `from "next"` imports must be replaced with shims in `src/lib/next-shim/`.

**Why:** The project was originally built for Next.js but runs in a React/Vite environment. The shims bridge the gap using wouter for routing.

**How to apply:** When adding new files that use Next.js APIs, import from `@/lib/next-shim/link`, `@/lib/next-shim/navigation`, `@/lib/next-shim/font-google`, or `@/lib/next-shim` (for types like `Metadata`). Never add `next` as a real dependency.

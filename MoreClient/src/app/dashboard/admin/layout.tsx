import React from "react";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/core/auth";
import { AdminNav } from "./_components/admin-nav";

/**
 * Server-component gate for the admin section. `proxy.ts` already enforces a
 * signed-in session; here we additionally require a platform-admin principal
 * (any role >= support) and 404 otherwise so the section is invisible to
 * non-admins. Each underlying API route re-checks the appropriate role.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireAdmin("support");
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <AdminNav />
      {children}
    </div>
  );
}

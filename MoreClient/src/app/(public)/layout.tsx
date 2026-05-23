import Link from "next/link";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-4 py-3 flex items-center justify-between max-w-4xl mx-auto">
        <Link href="/" className="text-lg font-bold text-gray-900">
          client<span className="text-blue-600">MORE</span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/sign-in" className="text-gray-600 hover:text-gray-900">Sign in</Link>
          <Link
            href="/sign-up"
            className="px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
          >
            Get started
          </Link>
        </div>
      </header>
      {children}
      <footer className="border-t border-gray-100 mt-16 px-4 py-6 text-center text-sm text-gray-400">
        <p>
          © {new Date().getFullYear()} clientMORE. All rights reserved.{" "}
          <a href="/legal/privacy" className="hover:underline">Privacy</a>
          {" · "}
          <a href="/legal/terms" className="hover:underline">Terms</a>
        </p>
      </footer>
    </div>
  );
}

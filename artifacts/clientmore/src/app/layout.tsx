import type { Metadata } from "@/lib/next-shim";
import { Inter, Cairo } from "@/lib/next-shim/font-google";
import "@/index.css";
import { LanguageProvider } from "@/components/language-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
});

export const metadata: Metadata = {
  title: "clientMORE — B2B AI Customer Support Agent",
  description: "B2B AI agent that replaces human support costs, learns from documents, speaks Arabic & English, and gets smarter with every conversation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${cairo.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[#050508] text-gray-100 font-sans">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}

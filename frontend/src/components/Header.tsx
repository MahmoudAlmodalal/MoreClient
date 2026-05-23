import LanguageToggle from "./LanguageToggle";

export default function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="flex items-start justify-between border-b border-slate-200 bg-white px-6 py-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      <LanguageToggle />
    </header>
  );
}

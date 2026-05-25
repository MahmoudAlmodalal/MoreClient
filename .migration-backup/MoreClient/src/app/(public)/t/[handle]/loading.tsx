export default function Loading() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading profile…</span>
      <section className="flex animate-pulse flex-col gap-6 sm:flex-row sm:items-start">
        <div className="h-24 w-24 shrink-0 rounded-full bg-gray-200" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="h-7 w-1/2 rounded bg-gray-200" />
          <div className="h-4 w-24 rounded bg-gray-200" />
          <div className="h-5 w-3/4 rounded bg-gray-200" />
          <div className="flex flex-wrap gap-3">
            <div className="h-4 w-20 rounded bg-gray-200" />
            <div className="h-4 w-24 rounded bg-gray-200" />
            <div className="h-4 w-16 rounded bg-gray-200" />
          </div>
        </div>
      </section>

      <section className="mt-10 animate-pulse space-y-3">
        <div className="h-5 w-24 rounded bg-gray-200" />
        <div className="h-4 w-full rounded bg-gray-200" />
        <div className="h-4 w-5/6 rounded bg-gray-200" />
      </section>

      <section className="mt-10 animate-pulse space-y-3">
        <div className="h-5 w-20 rounded bg-gray-200" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 w-24 rounded-full bg-gray-200" />
          ))}
        </div>
      </section>
    </main>
  );
}

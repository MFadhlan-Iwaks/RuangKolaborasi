'use client';

export default function WorkspaceSkeleton() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50">
      <div className="hidden w-20 shrink-0 border-r border-gray-200 bg-white p-4 sm:block">
        <div className="mb-4 h-11 w-11 animate-pulse rounded-xl bg-gray-200" />
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-11 w-11 animate-pulse rounded-xl bg-gray-100"
            />
          ))}
        </div>
      </div>

      <div className="hidden w-72 shrink-0 border-r border-gray-200 bg-gray-50 p-5 lg:block">
        <div className="mb-6 h-12 animate-pulse rounded-xl bg-gray-200" />
        <div className="mb-4 h-8 w-2/3 animate-pulse rounded-lg bg-gray-200" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((item) => (
            <div
              key={item}
              className="h-10 animate-pulse rounded-lg bg-gray-200/80"
            />
          ))}
        </div>
        <div className="mt-8 h-8 w-1/2 animate-pulse rounded-lg bg-gray-200" />
        <div className="mt-3 space-y-2">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-12 animate-pulse rounded-lg bg-gray-200/70"
            />
          ))}
        </div>
      </div>

      <main className="flex min-w-0 flex-1 flex-col bg-white">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 px-6">
          <div className="min-w-0 flex-1">
            <div className="h-5 w-48 animate-pulse rounded bg-gray-200" />
            <div className="mt-2 h-3 w-72 animate-pulse rounded bg-gray-100" />
          </div>
          <div className="hidden gap-2 xl:flex">
            <div className="h-9 w-28 animate-pulse rounded-lg bg-gray-100" />
            <div className="h-9 w-40 animate-pulse rounded-full bg-gray-100" />
            <div className="h-9 w-9 animate-pulse rounded-full bg-gray-100" />
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-hidden p-6">
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex gap-4">
              <div className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-gray-200" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-full max-w-xl animate-pulse rounded bg-gray-100" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>

        <div className="shrink-0 border-t border-gray-100 p-4">
          <div className="mx-auto h-14 max-w-4xl animate-pulse rounded-xl bg-gray-100" />
        </div>
      </main>
    </div>
  );
}

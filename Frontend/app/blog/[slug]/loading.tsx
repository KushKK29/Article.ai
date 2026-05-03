export default function ArticleLoading() {
  return (
    <section className="animate-pulse pt-8 pb-3 md:pt-12 md:pb-5">
      <div className="mx-auto w-full max-w-[1380px] px-3">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[300px_minmax(0,1fr)_280px] lg:gap-10 xl:gap-12">
          
          {/* Left Sidebar Skeleton */}
          <aside className="order-2 hidden w-full lg:order-1 lg:block">
            <div className="space-y-6">
              <div className="h-[280px] w-full rounded-xl bg-stone-200" />
              <div className="h-[280px] w-full rounded-xl bg-stone-200" />
            </div>
          </aside>

          {/* Main Content Skeleton */}
          <main className="order-1 w-full lg:order-2">
            <article className="mx-auto mb-16 w-full max-w-3xl">
              <div className="mb-8 h-[72px] w-full rounded-xl bg-stone-200/80" />
              
              <div className="mb-6 space-y-4">
                <div className="h-6 w-24 rounded-full bg-stone-200" />
                <div className="h-10 w-3/4 rounded-lg bg-stone-200" />
                <div className="h-4 w-full rounded bg-stone-200/70" />
                <div className="flex gap-3">
                  <div className="h-4 w-24 rounded bg-stone-200/60" />
                  <div className="h-4 w-24 rounded bg-stone-200/60" />
                </div>
              </div>

              <div className="mb-8 h-64 w-full rounded-xl bg-stone-200 md:h-80" />

              <div className="space-y-6">
                <div className="h-4 w-full rounded bg-stone-200/50" />
                <div className="h-4 w-full rounded bg-stone-200/50" />
                <div className="h-4 w-5/6 rounded bg-stone-200/50" />
                <div className="h-4 w-full rounded bg-stone-200/50" />
                <div className="h-4 w-4/6 rounded bg-stone-200/50" />
              </div>
            </article>
          </main>

          {/* Right Sidebar Skeleton */}
          <aside className="order-3 w-full lg:pl-3 xl:pl-4">
            <div className="space-y-10">
              <div className="space-y-4">
                <div className="h-4 w-32 rounded bg-stone-300" />
                <div className="space-y-2">
                  <div className="h-8 w-full rounded bg-stone-200/80" />
                  <div className="h-8 w-full rounded bg-stone-200/80" />
                  <div className="h-8 w-full rounded bg-stone-200/80" />
                </div>
              </div>
              <div className="h-[250px] w-full rounded-xl bg-stone-200" />
            </div>
          </aside>
          
        </div>
      </div>
    </section>
  );
}

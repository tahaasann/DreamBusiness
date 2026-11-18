/** Skeleton shown while the inbox loads, shaped like the real layout. */
export default function DashboardLoading() {
    return (
        <div className="flex h-dvh overflow-hidden bg-canvas" aria-busy="true">
            <aside className="hidden w-[16.5rem] shrink-0 flex-col gap-3 border-r border-line bg-subtle/70 p-5 lg:flex">
                <div className="shimmer h-7 w-32 rounded-lg" />
                <div className="shimmer mt-4 h-9 w-full rounded-xl" />
                <div className="mt-6 space-y-2">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="shimmer h-9 w-full rounded-xl" />
                    ))}
                </div>
            </aside>
            <section className="w-full space-y-3 border-r border-line p-4 md:w-[22rem] xl:w-[24rem]">
                <div className="shimmer h-6 w-40 rounded-md" />
                <div className="shimmer h-9 w-full rounded-xl" />
                <div className="shimmer h-8 w-full rounded-xl" />
                <div className="space-y-2 pt-2">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex gap-3 rounded-xl p-3">
                            <div className="shimmer size-8 shrink-0 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <div className="shimmer h-3 w-1/2 rounded-full" />
                                <div className="shimmer h-3 w-full rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>
            </section>
            <main className="hidden flex-1 p-8 md:block">
                <div className="mx-auto max-w-[46rem] space-y-4">
                    <div className="flex gap-3">
                        <div className="shimmer size-11 rounded-full" />
                        <div className="flex-1 space-y-2 pt-1">
                            <div className="shimmer h-4 w-48 rounded-full" />
                            <div className="shimmer h-3 w-32 rounded-full" />
                        </div>
                    </div>
                    <div className="shimmer h-20 w-full rounded-2xl" />
                    <div className="shimmer mt-6 h-56 w-full rounded-2xl" />
                </div>
            </main>
        </div>
    );
}

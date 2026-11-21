/** Skeleton while an admin page loads (also the Suspense boundary for the per-request session check). */
export default function AdminLoading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="mb-5 h-7 w-40 rounded bg-neutral-200" />
      <div className="mb-5 h-24 rounded-md border border-neutral-200 bg-white" />
      <div className="h-80 rounded-md border border-neutral-200 bg-white" />
    </div>
  );
}

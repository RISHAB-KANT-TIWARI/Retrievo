/**
 * Shown in place of the AI message bubble while waiting on POST /ask.
 * Mimics the shape of text lines with a shimmering gradient sweep,
 * per the "AI Thinking" spec — no generic spinners.
 */
export default function ThinkingSkeleton() {
  return (
    <div className="flex justify-start mb-4">
      <div className="w-full max-w-[75%] border border-border rounded-2xl rounded-bl-sm px-4 py-3 space-y-2">
        <div className="skeleton-shimmer h-3 rounded w-4/5" />
        <div className="skeleton-shimmer h-3 rounded w-3/5" />
        <div className="skeleton-shimmer h-3 rounded w-2/3" />
      </div>
    </div>
  );
}

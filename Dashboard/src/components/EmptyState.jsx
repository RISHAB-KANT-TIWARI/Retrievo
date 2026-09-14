/**
 * Shared empty/error state. Use whenever an API call in api/client.js
 * returns nothing (e.g. no chunks matched a question) or fails (network
 * error, backend down). Keeps the "never leave the user staring at a
 * static screen" rule from the design spec consistent everywhere.
 */
export default function EmptyState({ icon = "📄", title, description }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className="text-4xl mb-4 opacity-40">{icon}</div>
      <p className="text-text-primary text-sm font-medium mb-1">{title}</p>
      {description && <p className="text-text-muted text-xs max-w-xs">{description}</p>}
    </div>
  );
}

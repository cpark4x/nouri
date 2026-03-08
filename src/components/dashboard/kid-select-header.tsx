/**
 * KidSelectHeader — top-of-home "who's eating today?" prompt.
 * Pure presentational component; no props required.
 */
export function KidSelectHeader() {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-gray-900">Who&apos;s eating today?</h1>
      <p className="mt-1 text-sm text-gray-500">
        Tap a card to see nutrition details, or log a meal below.
      </p>
    </div>
  );
}

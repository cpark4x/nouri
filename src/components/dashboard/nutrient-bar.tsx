interface NutrientBarProps {
  label: string;
  current: number;
  target: number;
  unit: string;
}

export function NutrientBar({ label, current, target, unit }: NutrientBarProps) {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;

  let barColor: string;
  if (percentage >= 80) {
    barColor = "bg-emerald-500";
  } else if (percentage >= 40) {
    barColor = "bg-amber-500";
  } else {
    barColor = "bg-rose-500";
  }

  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-sm font-medium text-gray-600">
        {label}
      </span>
      <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-24 shrink-0 text-right text-sm tabular-nums text-gray-500">
        {Math.round(current)}/{Math.round(target)} {unit}
      </span>
    </div>
  );
}
interface MealStatusProps {
  meals: { mealType: string; logged: boolean; summary?: string }[];
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snack: "Snack",
  dinner: "Dinner",
};

const MEAL_ORDER = ["breakfast", "lunch", "snack", "dinner"];

export function MealStatus({ meals }: MealStatusProps) {
  const sorted = MEAL_ORDER.map(
    (type) =>
      meals.find((m) => m.mealType === type) ?? {
        mealType: type,
        logged: false,
      }
  );

  return (
    <div className="flex items-center gap-4">
      {sorted.map((meal) => (
        <div
          key={meal.mealType}
          className="flex items-center gap-1.5"
          title={meal.summary ?? `${MEAL_LABELS[meal.mealType] ?? meal.mealType} — not logged`}
        >
          {meal.logged ? (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3"><path d="M12.207 4.793a1 1 0 0 1 0 1.414l-5 5a1 1 0 0 1-1.414 0l-2.5-2.5a1 1 0 0 1 1.414-1.414L6.5 9.086l4.293-4.293a1 1 0 0 1 1.414 0z" /></svg>
            </span>
          ) : (
            <span className="flex h-4 w-4 items-center justify-center">
              <span className="h-2 w-2 rounded-full bg-gray-300" />
            </span>
          )}
          <span className="text-xs text-gray-500">{MEAL_LABELS[meal.mealType] ?? meal.mealType}</span>
        </div>
      ))}
    </div>
  );
}
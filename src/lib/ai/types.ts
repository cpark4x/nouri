export interface FoodItem {
  name: string;
  quantity: string; // "2 large", "1 cup", "a handful"
  estimatedGrams: number;
}

export interface NutritionEstimate {
  calories: number;
  protein: number; // grams
  calcium: number; // mg
  vitaminD: number; // IU
  iron: number; // mg
  zinc: number; // mg
  magnesium: number; // mg
  potassium: number; // mg
  vitaminA: number; // mcg
  vitaminC: number; // mg
  fiber: number; // grams
  omega3: number; // mg
}

export interface ParsedMeal {
  items: FoodItem[];
  totalNutrition: NutritionEstimate;
  confidence: "high" | "medium" | "low";
  assumptions: string[]; // e.g., "Assumed whole wheat toast"
  title: string; // AI-generated clean title e.g. "Scrambled Eggs & Toast"
  cleanDescription: string; // One readable sentence e.g. "Two scrambled eggs with buttered wheat toast and OJ."
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  content: string;
  actions?: Array<{
    type: "update_profile" | "save_recipe" | "log_meal";
    data: Record<string, unknown>;
  }>;
}

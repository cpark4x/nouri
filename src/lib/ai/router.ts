import { parseFoodDescription, chat } from "./providers/anthropic";
import { analyzeFoodPhoto } from "./providers/openai";
import { researchRecipes } from "./providers/gemini";

export const ai = {
  parseFoodDescription,
  analyzeFoodPhoto,
  chat,
  researchRecipes,
};

import type { Recipe, AgoRecipeJson, AgoStepJson, Step } from "./types";
import { DEVELOPERS } from "./constants";

export function recipeToAgoJson(recipe: Recipe): AgoRecipeJson {
  const sortedSteps = [...recipe.steps].sort(
    (a, b) => a.sort_order - b.sort_order
  );

  return {
    category: recipe.category,
    name: recipe.category === "BW" ? "B&W" : recipe.category,
    expanded_title: ` - ${recipe.film_stock} ${recipe.developer} ${recipe.dilution}`.trim(),
    steps: sortedSteps.map((s) => ({
      name: s.name,
      time_min: s.time_min,
      time_sec: s.time_sec,
      agitation: s.agitation,
      compensation: s.compensation,
      min_temperature: s.min_temperature,
      rated_temperature: s.rated_temperature,
      max_temperature: s.max_temperature,
      formula_designator: s.formula_designator,
      logo_text: s.logo_text,
    })),
  };
}

export function agoJsonToRecipeData(json: AgoRecipeJson): {
  name: string;
  film_stock: string;
  developer: string;
  dilution: string;
  category: string;
  steps: Omit<Step, "id" | "recipe_id">[];
} {
  // Parse expanded_title: " - Retro 400S 510 Pyro 1+100"
  let filmStock = "";
  let developer = "";
  let dilution = "";

  if (json.expanded_title) {
    const title = json.expanded_title.replace(/^\s*-\s*/, "").trim();
    let titleWithoutDilution = title;
    const dilutionMatch = title.match(/(\d+[+:]\d+)\s*$/);
    if (dilutionMatch) {
      dilution = dilutionMatch[1];
      titleWithoutDilution = title
        .slice(0, title.length - dilutionMatch[0].length)
        .trim();
    }

    const sortedDevelopers = [...DEVELOPERS].sort(
      (a, b) => b.length - a.length
    );
    const lowerTitle = titleWithoutDilution.toLowerCase();
    const matchedDeveloper = sortedDevelopers.find((candidate) =>
      lowerTitle.endsWith(candidate.toLowerCase())
    );

    if (matchedDeveloper) {
      developer = matchedDeveloper;
      filmStock = titleWithoutDilution
        .slice(0, titleWithoutDilution.length - matchedDeveloper.length)
        .trim();
    } else {
      filmStock = titleWithoutDilution;
    }
  }

  const categoryName =
    json.name === "B&W" ? "BW" : json.category || "BW";

  return {
    name: `${json.name}${json.expanded_title || ""}`.trim(),
    film_stock: filmStock,
    developer,
    dilution,
    category: categoryName,
    steps: json.steps.map(
      (s: AgoStepJson, i: number) => ({
        sort_order: i,
        name: s.name,
        time_min: s.time_min,
        time_sec: s.time_sec,
        agitation: s.agitation,
        compensation: s.compensation,
        min_temperature: s.min_temperature,
        rated_temperature: s.rated_temperature,
        max_temperature: s.max_temperature,
        formula_designator: s.formula_designator,
        logo_text: s.logo_text,
      })
    ),
  };
}

export function generateAgoFilename(recipe: Recipe): string {
  // Max 31 chars including .json extension (5 chars), so 26 chars for name
  const base = `${recipe.film_stock}_${recipe.developer}`
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 26);
  return `${base}.json`;
}

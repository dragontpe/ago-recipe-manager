import Database from "@tauri-apps/plugin-sql";
import type { Recipe, Step } from "./types";
import { DEFAULT_SETTINGS } from "./constants";

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load("sqlite:ago_recipes.db");
  }
  return db;
}

// Recipes

export async function fetchAllRecipes(): Promise<Recipe[]> {
  const d = await getDb();
  const rows = await d.select<
    Omit<Recipe, "steps">[]
  >("SELECT * FROM recipes ORDER BY updated_at DESC");

  const recipes: Recipe[] = [];
  for (const row of rows) {
    const steps = await d.select<Step[]>(
      "SELECT * FROM steps WHERE recipe_id = $1 ORDER BY sort_order",
      [row.id]
    );
    recipes.push({ ...row, steps });
  }
  return recipes;
}

export async function fetchRecipeById(id: string): Promise<Recipe | null> {
  const d = await getDb();
  const rows = await d.select<Omit<Recipe, "steps">[]>(
    "SELECT * FROM recipes WHERE id = $1",
    [id]
  );
  if (rows.length === 0) return null;

  const steps = await d.select<Step[]>(
    "SELECT * FROM steps WHERE recipe_id = $1 ORDER BY sort_order",
    [id]
  );
  return { ...rows[0], steps };
}

export async function insertRecipe(recipe: Omit<Recipe, "steps">): Promise<void> {
  const d = await getDb();
  await d.execute(
    `INSERT INTO recipes (id, name, film_stock, developer, dilution, category, notes, dev_time_reduced, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      recipe.id,
      recipe.name,
      recipe.film_stock,
      recipe.developer,
      recipe.dilution,
      recipe.category,
      recipe.notes,
      recipe.dev_time_reduced ?? 0,
      recipe.created_at,
      recipe.updated_at,
    ]
  );
}

export async function updateRecipe(
  id: string,
  fields: Partial<Omit<Recipe, "id" | "steps" | "created_at">>
): Promise<void> {
  const d = await getDb();
  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const [key, value] of Object.entries(fields)) {
    sets.push(`${key} = $${idx}`);
    values.push(value);
    idx++;
  }

  // Always update updated_at
  sets.push(`updated_at = $${idx}`);
  values.push(new Date().toISOString());
  idx++;

  values.push(id);
  await d.execute(
    `UPDATE recipes SET ${sets.join(", ")} WHERE id = $${idx}`,
    values
  );
}

export async function deleteRecipe(id: string): Promise<void> {
  const d = await getDb();
  await d.execute("DELETE FROM steps WHERE recipe_id = $1", [id]);
  await d.execute("DELETE FROM recipes WHERE id = $1", [id]);
}

export async function duplicateRecipe(sourceId: string, newId: string): Promise<void> {
  const source = await fetchRecipeById(sourceId);
  if (!source) throw new Error("Recipe not found");

  const now = new Date().toISOString();
  await insertRecipe({
    id: newId,
    name: `${source.name} (copy)`,
    film_stock: source.film_stock,
    developer: source.developer,
    dilution: source.dilution,
    category: source.category,
    notes: source.notes,
    dev_time_reduced: 0,
    created_at: now,
    updated_at: now,
  });

  for (const step of source.steps) {
    await insertStep({
      ...step,
      id: crypto.randomUUID(),
      recipe_id: newId,
    });
  }
}

// Steps

export async function insertStep(step: Step): Promise<void> {
  const d = await getDb();
  await d.execute(
    `INSERT INTO steps (id, recipe_id, sort_order, name, time_min, time_sec, agitation, compensation, min_temperature, rated_temperature, max_temperature, formula_designator, logo_text)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      step.id,
      step.recipe_id,
      step.sort_order,
      step.name,
      step.time_min,
      step.time_sec,
      step.agitation,
      step.compensation,
      step.min_temperature,
      step.rated_temperature,
      step.max_temperature,
      step.formula_designator,
      step.logo_text,
    ]
  );
}

export async function updateStep(
  id: string,
  fields: Partial<Omit<Step, "id" | "recipe_id">>
): Promise<void> {
  const d = await getDb();
  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const [key, value] of Object.entries(fields)) {
    sets.push(`${key} = $${idx}`);
    values.push(value);
    idx++;
  }

  values.push(id);
  await d.execute(
    `UPDATE steps SET ${sets.join(", ")} WHERE id = $${idx}`,
    values
  );
}

export async function deleteStep(id: string): Promise<void> {
  const d = await getDb();
  await d.execute("DELETE FROM steps WHERE id = $1", [id]);
}

export async function updateStepOrders(
  steps: { id: string; sort_order: number }[]
): Promise<void> {
  const d = await getDb();
  for (const step of steps) {
    await d.execute("UPDATE steps SET sort_order = $1 WHERE id = $2", [
      step.sort_order,
      step.id,
    ]);
  }
}

// Also update recipe's updated_at when steps change
export async function touchRecipe(id: string): Promise<void> {
  const d = await getDb();
  await d.execute("UPDATE recipes SET updated_at = $1 WHERE id = $2", [
    new Date().toISOString(),
    id,
  ]);
}

// Settings

export async function fetchAllSettings(): Promise<Record<string, string>> {
  const d = await getDb();
  const rows = await d.select<{ key: string; value: string }[]>(
    "SELECT key, value FROM settings"
  );
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

export async function ensureDefaultSettings(): Promise<void> {
  const d = await getDb();
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await d.execute(
      "INSERT OR IGNORE INTO settings (key, value) VALUES ($1, $2)",
      [key, value]
    );
  }
}

export async function upsertSetting(key: string, value: string): Promise<void> {
  const d = await getDb();
  await d.execute(
    "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = $2",
    [key, value]
  );
}

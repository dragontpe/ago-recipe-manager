import { useMemo, useState } from "react";
import { useAppStore } from "../lib/store";

export function RecipeList() {
  const recipes = useAppStore((s) => s.recipes);
  const selectedRecipeId = useAppStore((s) => s.selectedRecipeId);
  const selectRecipe = useAppStore((s) => s.selectRecipe);
  const createRecipe = useAppStore((s) => s.createRecipe);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const [sortBy, setSortBy] = useState<"modified" | "created" | "name">(
    "modified"
  );

  const filtered = useMemo(
    () =>
      recipes.filter((r) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          r.film_stock.toLowerCase().includes(q) ||
          r.developer.toLowerCase().includes(q)
        );
      }),
    [recipes, searchQuery]
  );

  const sortedFiltered = useMemo(() => {
    const out = [...filtered];
    if (sortBy === "name") {
      out.sort((a, b) => a.name.localeCompare(b.name));
      return out;
    }
    if (sortBy === "created") {
      out.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      return out;
    }
    out.sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
    return out;
  }, [filtered, sortBy]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* New Recipe button */}
      <div className="px-2 pb-2">
        <button
          onClick={createRecipe}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-(--color-accent) text-white rounded-md text-sm font-medium hover:bg-(--color-accent-hover) transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Recipe
        </button>
      </div>

      {/* Search */}
      {recipes.length > 0 && (
        <div className="px-2 pb-2">
          <input
            type="text"
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs rounded-md bg-(--color-surface) border border-(--color-border) text-(--color-text-primary) placeholder:(--color-text-tertiary) outline-none focus:border-(--color-accent)"
          />
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as "modified" | "created" | "name")
            }
            className="w-full mt-1.5 px-2.5 py-1.5 text-xs rounded-md bg-(--color-surface) border border-(--color-border) text-(--color-text-primary) outline-none focus:border-(--color-accent)"
          >
            <option value="modified">Sort: Date Modified</option>
            <option value="created">Sort: Date Created</option>
            <option value="name">Sort: Name (A-Z)</option>
          </select>
        </div>
      )}

      {/* Recipe list */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {sortedFiltered.map((recipe) => (
          <button
            key={recipe.id}
            onClick={() => selectRecipe(recipe.id)}
            className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
              selectedRecipeId === recipe.id
                ? "bg-(--color-accent) text-white"
                : "hover:bg-(--color-surface-hover)"
            }`}
          >
            <div className="text-sm font-medium truncate">
              {recipe.name || "Untitled"}
            </div>
            <div
              className={`text-xs truncate ${
                selectedRecipeId === recipe.id
                  ? "text-white/70"
                  : "text-(--color-text-secondary)"
              }`}
            >
              {[recipe.film_stock, recipe.developer, recipe.dilution]
                .filter(Boolean)
                .join(" - ") || "No details"}
            </div>
          </button>
        ))}
        {sortedFiltered.length === 0 && recipes.length > 0 && (
          <p className="text-xs text-(--color-text-tertiary) text-center py-4">
            No matching recipes
          </p>
        )}
      </div>
    </div>
  );
}

import { useAppStore } from "../lib/store";

export function EmptyState() {
  const createRecipe = useAppStore((s) => s.createRecipe);
  const recipes = useAppStore((s) => s.recipes);

  const hasRecipes = recipes.length > 0;

  return (
    <div className="h-full flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-(--color-border) bg-(--color-surface-secondary) p-8 text-center">
        {/* Film canister icon */}
        <div className="w-16 h-16 mx-auto mb-5 rounded-xl bg-(--color-surface) border border-(--color-border) flex items-center justify-center">
          <svg className="w-8 h-8 text-(--color-text-secondary)" fill="none" viewBox="0 0 24 24" strokeWidth={1.3} stroke="currentColor">
            <rect x="6" y="3" width="12" height="18" rx="2" />
            <circle cx="12" cy="12" r="3" />
            <line x1="8" y1="6" x2="10" y2="6" />
            <line x1="14" y1="6" x2="16" y2="6" />
            <line x1="8" y1="18" x2="10" y2="18" />
            <line x1="14" y1="18" x2="16" y2="18" />
          </svg>
        </div>
        <p
          className="text-xl text-(--color-text-primary) mb-1.5"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {hasRecipes ? "Select a recipe" : "Your darkroom is empty"}
        </p>
        <p className="text-sm text-(--color-text-secondary) mb-4 leading-relaxed">
          {hasRecipes
            ? "Choose a recipe from the sidebar to view and edit its processing steps."
            : "Create your first development recipe and start building your AGO program library."}
        </p>
        {!hasRecipes && (
          <button
            onClick={createRecipe}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-(--color-accent) text-white rounded-full text-sm font-medium hover:bg-(--color-accent-hover) hover:-translate-y-0.5 transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Recipe
          </button>
        )}
      </div>
    </div>
  );
}

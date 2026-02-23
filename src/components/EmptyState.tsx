import { useAppStore } from "../lib/store";

export function EmptyState() {
  const createRecipe = useAppStore((s) => s.createRecipe);
  const recipes = useAppStore((s) => s.recipes);

  return (
    <div className="h-full flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-(--color-border) bg-(--color-surface-secondary) p-8 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-(--color-surface) border border-(--color-border) flex items-center justify-center">
          <svg className="w-7 h-7 text-(--color-text-secondary)" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.5A1.5 1.5 0 0 1 5.25 3h13.5a1.5 1.5 0 0 1 1.5 1.5v15a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-15Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5h7.5M8.25 12h7.5M8.25 16.5h4.5" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-(--color-text-primary) mb-1">
          {recipes.length === 0 ? "No recipes yet" : "Select a recipe"}
        </p>
        <p className="text-sm text-(--color-text-secondary) mb-4">
          {recipes.length === 0
            ? "Create your first development recipe to start building your AGO library."
            : "Choose a recipe from the sidebar to view and edit its steps."}
        </p>
      </div>
      {recipes.length === 0 && (
        <button
          onClick={createRecipe}
          className="mt-4 px-4 py-2 bg-(--color-accent) text-white rounded-lg text-sm font-medium hover:bg-(--color-accent-hover) transition-colors"
        >
          New Recipe
        </button>
      )}
    </div>
  );
}

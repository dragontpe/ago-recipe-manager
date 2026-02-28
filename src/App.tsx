import { useEffect, useState, useCallback, Component, type ReactNode } from "react";
import { useAppStore } from "./lib/store";
import { Sidebar } from "./components/Sidebar";
import { RecipeEditor } from "./components/RecipeEditor";
import { AgoConnection } from "./components/AgoConnection";
import { AgoPrograms } from "./components/AgoPrograms";
import { Settings } from "./components/Settings";
import { MdcLookup } from "./components/MdcLookup";
import { EmptyState } from "./components/EmptyState";
import { Toast } from "./components/Toast";
import { SplashScreen } from "./components/SplashScreen";

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { error: `${error.message}\n${error.stack}` };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 20, fontFamily: "monospace", fontSize: 12, whiteSpace: "pre-wrap", color: "#ff3b30" }}>
          <h2>Error</h2>
          <pre>{this.state.error}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppInner() {
  const activeView = useAppStore((s) => s.activeView);
  const selectedRecipeId = useAppStore((s) => s.selectedRecipeId);
  const recipes = useAppStore((s) => s.recipes);
  const loadRecipes = useAppStore((s) => s.loadRecipes);
  const loadSettings = useAppStore((s) => s.loadSettings);

  useEffect(() => {
    loadRecipes().catch((e) => console.error("loadRecipes failed:", e));
    loadSettings().catch((e) => console.error("loadSettings failed:", e));
  }, [loadRecipes, loadSettings]);

  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId) ?? null;

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-(--color-surface)">
        {activeView === "recipes" && (
          selectedRecipe ? (
            <RecipeEditor recipe={selectedRecipe} />
          ) : (
            <EmptyState />
          )
        )}
        {activeView === "massdev" && <MdcLookup />}
        {activeView === "connection" && <AgoConnection />}
        {activeView === "uploads" && (
          <div className="max-w-xl mx-auto p-6">
            <h2 className="text-2xl font-semibold mb-6">Uploaded Programs</h2>
            <AgoPrograms />
          </div>
        )}
        {activeView === "settings" && <Settings />}
      </main>
      <Toast />
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const hideSplash = useCallback(() => setShowSplash(false), []);

  return (
    <ErrorBoundary>
      {showSplash && <SplashScreen onComplete={hideSplash} />}
      <AppInner />
    </ErrorBoundary>
  );
}

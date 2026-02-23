import { create } from "zustand";
import type { Recipe, ViewType } from "./types";
import * as db from "./db";
import { defaultStep, DEFAULT_TEMPLATE_STEPS, DEFAULT_SETTINGS } from "./constants";

const WRITE_DEBOUNCE_MS = 300;
const recipeUpdateTimers = new Map<string, ReturnType<typeof setTimeout>>();
const pendingRecipeUpdates = new Map<string, Record<string, string>>();
const stepUpdateTimers = new Map<string, ReturnType<typeof setTimeout>>();
const pendingStepUpdates = new Map<string, Record<string, string | number>>();

interface AppState {
  // Navigation
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;

  // Recipes
  recipes: Recipe[];
  selectedRecipeId: string | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  loadRecipes: () => Promise<void>;
  selectRecipe: (id: string | null) => void;
  createRecipe: () => Promise<string>;
  updateRecipeField: (
    id: string,
    field: string,
    value: string
  ) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  duplicateRecipe: (id: string) => Promise<void>;

  // Steps
  addStep: (recipeId: string, stepName?: string) => Promise<void>;
  updateStepField: (
    stepId: string,
    field: string,
    value: string | number
  ) => Promise<void>;
  deleteStep: (recipeId: string, stepId: string) => Promise<void>;
  reorderSteps: (recipeId: string, oldIndex: number, newIndex: number) => Promise<void>;

  // WiFi
  wifiStatus: "disconnected" | "connecting" | "connected";
  currentSsid: string;
  previousSsid: string;
  wifiInterface: string;
  setWifiStatus: (status: "disconnected" | "connecting" | "connected") => void;
  setCurrentSsid: (ssid: string) => void;
  setPreviousSsid: (ssid: string) => void;
  setWifiInterface: (iface: string) => void;

  // Settings
  settings: Record<string, string>;
  loadSettings: () => Promise<void>;
  updateSetting: (key: string, value: string) => Promise<void>;

  // Toast
  toast: { message: string; type: "success" | "error" | "info" } | null;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  clearToast: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Navigation
  activeView: "recipes",
  setActiveView: (view) => set({ activeView: view }),

  // Recipes
  recipes: [],
  selectedRecipeId: null,
  searchQuery: "",
  setSearchQuery: (q) => set({ searchQuery: q }),

  loadRecipes: async () => {
    const recipes = await db.fetchAllRecipes();
    set({ recipes });
  },

  selectRecipe: (id) => set({ selectedRecipeId: id }),

  createRecipe: async () => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const settings = get().settings;

    try {
      await db.insertRecipe({
        id,
        name: "New Recipe",
        film_stock: "",
        developer: "",
        dilution: "",
        category: "BW",
        notes: "",
        created_at: now,
        updated_at: now,
      });

      // Add default template steps
      for (let i = 0; i < DEFAULT_TEMPLATE_STEPS.length; i++) {
        const stepName = DEFAULT_TEMPLATE_STEPS[i];
        const stepDefaults = defaultStep(id, i, stepName);
        stepDefaults.min_temperature = parseFloat(settings.default_min_temp || "18");
        stepDefaults.rated_temperature = parseFloat(settings.default_rated_temp || "20");
        stepDefaults.max_temperature = parseFloat(settings.default_max_temp || "24");

        await db.insertStep({
          id: crypto.randomUUID(),
          ...stepDefaults,
        });
      }

      await get().loadRecipes();
      set({ selectedRecipeId: id });
      return id;
    } catch (e) {
      console.error("createRecipe failed:", e);
      get().showToast(`Failed to create recipe: ${e}`, "error");
      return "";
    }
  },

  updateRecipeField: async (id, field, value) => {
    const now = new Date().toISOString();
    set((state) => ({
      recipes: state.recipes.map((r) =>
        r.id === id ? { ...r, [field]: value, updated_at: now } : r
      ),
    }));

    const merged = { ...(pendingRecipeUpdates.get(id) || {}), [field]: value };
    pendingRecipeUpdates.set(id, merged);

    const existingTimer = recipeUpdateTimers.get(id);
    if (existingTimer) clearTimeout(existingTimer);

    recipeUpdateTimers.set(
      id,
      setTimeout(async () => {
        const fields = pendingRecipeUpdates.get(id);
        recipeUpdateTimers.delete(id);
        pendingRecipeUpdates.delete(id);
        if (!fields) return;

        try {
          await db.updateRecipe(id, fields);
          await get().loadRecipes();
        } catch (e) {
          console.error("updateRecipeField failed:", e);
          get().showToast("Failed to save recipe changes", "error");
        }
      }, WRITE_DEBOUNCE_MS)
    );
  },

  deleteRecipe: async (id) => {
    const timer = recipeUpdateTimers.get(id);
    if (timer) clearTimeout(timer);
    recipeUpdateTimers.delete(id);
    pendingRecipeUpdates.delete(id);

    const stepIds = get()
      .recipes.find((r) => r.id === id)
      ?.steps.map((s) => s.id) ?? [];
    for (const stepId of stepIds) {
      const stepTimer = stepUpdateTimers.get(stepId);
      if (stepTimer) clearTimeout(stepTimer);
      stepUpdateTimers.delete(stepId);
      pendingStepUpdates.delete(stepId);
    }

    await db.deleteRecipe(id);
    const { selectedRecipeId } = get();
    if (selectedRecipeId === id) {
      set({ selectedRecipeId: null });
    }
    await get().loadRecipes();
    get().showToast("Recipe deleted");
  },

  duplicateRecipe: async (id) => {
    const newId = crypto.randomUUID();
    await db.duplicateRecipe(id, newId);
    await get().loadRecipes();
    set({ selectedRecipeId: newId });
    get().showToast("Recipe duplicated");
  },

  // Steps
  addStep: async (recipeId, stepName = "RINSE") => {
    const recipe = get().recipes.find((r) => r.id === recipeId);
    const sortOrder = recipe ? recipe.steps.length : 0;
    const settings = get().settings;
    const stepDefaults = defaultStep(recipeId, sortOrder, stepName);
    stepDefaults.min_temperature = parseFloat(settings.default_min_temp || "18");
    stepDefaults.rated_temperature = parseFloat(settings.default_rated_temp || "20");
    stepDefaults.max_temperature = parseFloat(settings.default_max_temp || "24");

    await db.insertStep({
      id: crypto.randomUUID(),
      ...stepDefaults,
    });
    await db.touchRecipe(recipeId);
    await get().loadRecipes();
  },

  updateStepField: async (stepId, field, value) => {
    const recipeId =
      get()
        .recipes.find((r) => r.steps.some((s) => s.id === stepId))
        ?.id ?? null;

    set((state) => ({
      recipes: state.recipes.map((r) =>
        r.id !== recipeId
          ? r
          : {
              ...r,
              updated_at: new Date().toISOString(),
              steps: r.steps.map((s) =>
                s.id === stepId ? { ...s, [field]: value } : s
              ),
            }
      ),
    }));

    const merged = { ...(pendingStepUpdates.get(stepId) || {}), [field]: value };
    pendingStepUpdates.set(stepId, merged);

    const existingTimer = stepUpdateTimers.get(stepId);
    if (existingTimer) clearTimeout(existingTimer);

    stepUpdateTimers.set(
      stepId,
      setTimeout(async () => {
        const fields = pendingStepUpdates.get(stepId);
        stepUpdateTimers.delete(stepId);
        pendingStepUpdates.delete(stepId);
        if (!fields) return;

        try {
          await db.updateStep(stepId, fields);
          if (recipeId) {
            await db.touchRecipe(recipeId);
          }
          await get().loadRecipes();
        } catch (e) {
          console.error("updateStepField failed:", e);
          get().showToast("Failed to save step changes", "error");
        }
      }, WRITE_DEBOUNCE_MS)
    );
  },

  deleteStep: async (recipeId, stepId) => {
    const timer = stepUpdateTimers.get(stepId);
    if (timer) clearTimeout(timer);
    stepUpdateTimers.delete(stepId);
    pendingStepUpdates.delete(stepId);

    await db.deleteStep(stepId);
    await db.touchRecipe(recipeId);
    await get().loadRecipes();
  },

  reorderSteps: async (recipeId, oldIndex, newIndex) => {
    const recipe = get().recipes.find((r) => r.id === recipeId);
    if (!recipe) return;

    const steps = [...recipe.steps].sort((a, b) => a.sort_order - b.sort_order);
    const [moved] = steps.splice(oldIndex, 1);
    steps.splice(newIndex, 0, moved);

    const updates = steps.map((s, i) => ({ id: s.id, sort_order: i }));
    await db.updateStepOrders(updates);
    await db.touchRecipe(recipeId);
    await get().loadRecipes();
  },

  // WiFi
  wifiStatus: "disconnected",
  currentSsid: "",
  previousSsid: "",
  wifiInterface: "",
  setWifiStatus: (status) => set({ wifiStatus: status }),
  setCurrentSsid: (ssid) => set({ currentSsid: ssid }),
  setPreviousSsid: (ssid) => set({ previousSsid: ssid }),
  setWifiInterface: (iface) => set({ wifiInterface: iface }),

  // Settings
  settings: {},
  loadSettings: async () => {
    await db.ensureDefaultSettings();
    const settings = await db.fetchAllSettings();
    set({ settings: { ...DEFAULT_SETTINGS, ...settings } });
  },
  updateSetting: async (key, value) => {
    await db.upsertSetting(key, value);
    set((state) => ({
      settings: { ...state.settings, [key]: value },
    }));
  },

  // Toast
  toast: null,
  showToast: (message, type = "success") => {
    set({ toast: { message, type } });
    setTimeout(() => {
      set({ toast: null });
    }, 3000);
  },
  clearToast: () => set({ toast: null }),
}));

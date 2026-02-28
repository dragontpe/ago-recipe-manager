import { useState } from "react";
import { useAppStore } from "../lib/store";
import { StepList } from "./StepList";
import { recipeToAgoJson, generateAgoFilename } from "../lib/ago-format";
import { invoke } from "@tauri-apps/api/core";
import type { Recipe } from "../lib/types";
import { DEVELOPERS } from "../lib/constants";
import { insertAgoUpload } from "../lib/db";

export function RecipeEditor({ recipe }: { recipe: Recipe }) {
  const updateRecipeField = useAppStore((s) => s.updateRecipeField);
  const deleteRecipe = useAppStore((s) => s.deleteRecipe);
  const duplicateRecipe = useAppStore((s) => s.duplicateRecipe);
  const showToast = useAppStore((s) => s.showToast);
  const settings = useAppStore((s) => s.settings);
  const wifiStatus = useAppStore((s) => s.wifiStatus);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const recipeMetaSummary = [recipe.film_stock, recipe.developer, recipe.dilution]
    .filter(Boolean)
    .join(" • ");

  const handleExport = async () => {
    try {
      const agoJson = recipeToAgoJson(recipe);
      const jsonContent = JSON.stringify(agoJson, null, 2);
      const filename = generateAgoFilename(recipe);
      await invoke("export_recipe_file", {
        jsonContent,
        defaultName: filename,
      });
      showToast("Recipe exported");
    } catch (e) {
      const msg = String(e);
      if (!msg.includes("cancelled")) {
        showToast(`Export failed: ${msg}`, "error");
      }
    }
  };

  const handleUpload = async () => {
    const ip = settings.ago_ip || "10.10.10.1";
    const endpoint = settings.ago_upload_endpoint || "/api/files/programs/custom";
    const fieldName = settings.ago_upload_field || "json";
    const filename = generateAgoFilename(recipe);

    try {
      const agoJson = recipeToAgoJson(recipe);
      const result = await invoke<{ message: string; ago_filename: string }>("upload_recipe_file", {
        ip,
        endpoint,
        fieldName,
        filename,
        jsonContent: JSON.stringify(agoJson, null, 2),
        filmStock: recipe.film_stock,
        developer: recipe.developer,
        dilution: recipe.dilution,
      });
      await insertAgoUpload({
        id: crypto.randomUUID(),
        recipe_id: recipe.id,
        filename: result.ago_filename,
        display_name: recipe.name || recipe.film_stock || "Custom Program",
        uploaded_at: new Date().toISOString(),
      });
      showToast("Recipe uploaded to AGO");
    } catch (e) {
      showToast(`Upload failed: ${e}`, "error");
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <section className="rounded-3xl border border-(--color-border) bg-(--color-surface-secondary) p-6">
        <p className="text-[11px] uppercase tracking-[0.16em] text-(--color-text-tertiary) mb-2">
          Customize AGO Program
        </p>
        <input
          type="text"
          value={recipe.name}
          onChange={(e) =>
            updateRecipeField(recipe.id, "name", e.target.value)
          }
          className="text-4xl leading-tight font-semibold bg-transparent border-none outline-none w-full text-(--color-text-primary) placeholder:(--color-text-tertiary)"
          placeholder="Recipe Name"
        />
        {recipeMetaSummary && (
          <p className="mt-3 text-sm text-(--color-text-secondary)">
            {recipeMetaSummary}
          </p>
        )}
      </section>

      <section className="rounded-3xl border border-(--color-border) bg-(--color-surface-secondary) p-3">
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={handleUpload}
            disabled={wifiStatus !== "connected"}
            className="flex items-center gap-1.5 px-5 py-2.5 text-sm rounded-full bg-(--color-accent) text-white hover:bg-(--color-accent-hover) transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            title={
              wifiStatus === "connected"
                ? "Upload recipe directly to AGO"
                : "Connect to AGO WiFi first"
            }
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75 10.5 18l9-13.5" />
            </svg>
            Upload to AGO
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm rounded-full border border-(--color-border) text-(--color-text-secondary) hover:bg-(--color-surface-hover) transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            Export
          </button>
          <button
            onClick={() => duplicateRecipe(recipe.id)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm rounded-full border border-(--color-border) text-(--color-text-secondary) hover:bg-(--color-surface-hover) transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
            </svg>
            Duplicate
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm rounded-full border border-(--color-border) text-(--color-danger) hover:bg-(--color-danger)/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
            Delete
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-(--color-border) bg-(--color-surface-secondary) p-5 space-y-4">
        <h3 className="text-sm font-semibold text-(--color-text-secondary) uppercase tracking-[0.08em]">
          Recipe Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-(--color-text-secondary) mb-1">
              Film Stock
            </label>
            <input
              type="text"
              value={recipe.film_stock}
              onChange={(e) =>
                updateRecipeField(recipe.id, "film_stock", e.target.value)
              }
              className="w-full px-3 py-2 text-sm rounded-lg bg-(--color-surface) border border-(--color-border) text-(--color-text-primary) outline-none focus:border-(--color-accent)"
              placeholder="e.g. Rollei Retro 400S"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-(--color-text-secondary) mb-1">
              Developer
            </label>
            <input
              type="text"
              list="developers"
              value={recipe.developer}
              onChange={(e) =>
                updateRecipeField(recipe.id, "developer", e.target.value)
              }
              className="w-full px-3 py-2 text-sm rounded-lg bg-(--color-surface) border border-(--color-border) text-(--color-text-primary) outline-none focus:border-(--color-accent)"
              placeholder="e.g. 510 Pyro"
            />
            <datalist id="developers">
              {DEVELOPERS.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-medium text-(--color-text-secondary) mb-1">
              Dilution
            </label>
            <input
              type="text"
              value={recipe.dilution}
              onChange={(e) =>
                updateRecipeField(recipe.id, "dilution", e.target.value)
              }
              className="w-full px-3 py-2 text-sm rounded-lg bg-(--color-surface) border border-(--color-border) text-(--color-text-primary) outline-none focus:border-(--color-accent)"
              placeholder="e.g. 1+100"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-(--color-text-secondary) mb-1">
            Notes
          </label>
          <textarea
            value={recipe.notes}
            onChange={(e) =>
              updateRecipeField(recipe.id, "notes", e.target.value)
            }
            rows={3}
            className="w-full px-3 py-2 text-sm rounded-lg bg-(--color-surface) border border-(--color-border) text-(--color-text-primary) outline-none focus:border-(--color-accent) resize-none"
            placeholder="Development notes, special instructions..."
          />
        </div>
      </section>

      <section className="rounded-3xl border border-(--color-border) bg-(--color-surface-secondary) p-5">
        <h3 className="text-sm font-semibold text-(--color-text-secondary) mb-3 uppercase tracking-[0.08em]">
          Processing Steps
        </h3>
        <StepList recipe={recipe} />
      </section>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-6 shadow-2xl max-w-sm">
            <h3 className="text-lg font-semibold mb-2">Delete Recipe?</h3>
            <p className="text-sm text-(--color-text-secondary) mb-4">
              "{recipe.name}" will be permanently deleted. This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-1.5 text-sm rounded-md border border-(--color-border) hover:bg-(--color-surface-hover) transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteRecipe(recipe.id)}
                className="px-4 py-1.5 text-sm rounded-md bg-(--color-danger) text-white hover:opacity-90 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

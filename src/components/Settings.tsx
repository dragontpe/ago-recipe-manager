import { useState } from "react";
import { useAppStore } from "../lib/store";
import { invoke } from "@tauri-apps/api/core";
import { agoJsonToRecipeData } from "../lib/ago-format";
import * as db from "../lib/db";

export function Settings() {
  const { settings, updateSetting, showToast, loadRecipes } = useAppStore();
  const [uploadDebugLog, setUploadDebugLog] = useState("");

  const handleImport = async () => {
    try {
      const content = await invoke<string>("import_recipe_file", {});
      const parsed = JSON.parse(content);
      const recipeData = agoJsonToRecipeData(parsed);

      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      await db.insertRecipe({
        id,
        name: recipeData.name,
        film_stock: recipeData.film_stock,
        developer: recipeData.developer,
        dilution: recipeData.dilution,
        category: recipeData.category,
        notes: "",
        created_at: now,
        updated_at: now,
      });

      for (const step of recipeData.steps) {
        await db.insertStep({
          id: crypto.randomUUID(),
          recipe_id: id,
          ...step,
        });
      }

      await loadRecipes();
      showToast("Recipe imported");
    } catch (e) {
      const msg = String(e);
      if (!msg.includes("cancelled")) {
        showToast(`Import failed: ${msg}`, "error");
      }
    }
  };

  const handleLoadUploadDebug = async () => {
    try {
      const content = await invoke<string>("get_upload_debug_log");
      setUploadDebugLog(content);
    } catch (e) {
      showToast(`Failed to load upload debug log: ${e}`, "error");
    }
  };

  const handleClearUploadDebug = async () => {
    try {
      await invoke("clear_upload_debug_log");
      setUploadDebugLog("");
      showToast("Upload debug log cleared", "info");
    } catch (e) {
      showToast(`Failed to clear upload debug log: ${e}`, "error");
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-6">Settings</h2>

      {/* AGO Connection */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold text-(--color-text-secondary) mb-3 uppercase tracking-wider">
          AGO Connection
        </h3>
        <div className="space-y-3">
          <SettingField
            label="AGO IP Address"
            value={settings.ago_ip || ""}
            onChange={(v) => updateSetting("ago_ip", v)}
            placeholder="10.10.10.1"
          />
          <SettingField
            label="WiFi SSID"
            value={settings.ago_ssid || ""}
            onChange={(v) => updateSetting("ago_ssid", v)}
            placeholder="AGO"
          />
          <SettingField
            label="WiFi Password"
            value={settings.ago_password || ""}
            onChange={(v) => updateSetting("ago_password", v)}
            placeholder="12345678"
            type="password"
          />
          <div className="flex items-center justify-between py-1">
            <label className="text-sm text-(--color-text-primary)">
              Auto-reconnect to previous WiFi
            </label>
            <button
              onClick={() =>
                updateSetting(
                  "auto_reconnect",
                  settings.auto_reconnect === "true" ? "false" : "true"
                )
              }
              className={`w-10 h-6 rounded-full transition-colors relative ${
                settings.auto_reconnect === "true"
                  ? "bg-(--color-accent)"
                  : "bg-(--color-border)"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  settings.auto_reconnect === "true"
                    ? "translate-x-4.5"
                    : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>
        <details className="mt-3">
          <summary className="text-xs text-(--color-text-tertiary) cursor-pointer hover:text-(--color-text-secondary)">
            Advanced upload overrides (optional)
          </summary>
          <div className="mt-2 space-y-3">
            <SettingField
              label="Compatibility Upload Endpoint"
              value={settings.ago_upload_endpoint || ""}
              onChange={(v) => updateSetting("ago_upload_endpoint", v)}
              placeholder="/api/files/programs/custom"
            />
            <SettingField
              label="Compatibility Upload Field"
              value={settings.ago_upload_field || ""}
              onChange={(v) => updateSetting("ago_upload_field", v)}
              placeholder="json"
            />
          </div>
        </details>
      </section>

      {/* Default Temperatures */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold text-(--color-text-secondary) mb-3 uppercase tracking-wider">
          Default Temperatures
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <SettingField
            label="Min (C)"
            value={settings.default_min_temp || ""}
            onChange={(v) => updateSetting("default_min_temp", v)}
            placeholder="18"
            type="number"
          />
          <SettingField
            label="Rated (C)"
            value={settings.default_rated_temp || ""}
            onChange={(v) => updateSetting("default_rated_temp", v)}
            placeholder="20"
            type="number"
          />
          <SettingField
            label="Max (C)"
            value={settings.default_max_temp || ""}
            onChange={(v) => updateSetting("default_max_temp", v)}
            placeholder="24"
            type="number"
          />
        </div>
      </section>

      {/* Import */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold text-(--color-text-secondary) mb-3 uppercase tracking-wider">
          Import / Export
        </h3>
        <p className="text-sm text-(--color-text-secondary) mb-3">
          Import an AGO program JSON file into your recipe library.
        </p>
        <button
          onClick={handleImport}
          className="px-4 py-2 bg-(--color-surface-secondary) border border-(--color-border) rounded-lg text-sm font-medium hover:bg-(--color-surface-hover) transition-colors"
        >
          Import Recipe from JSON
        </button>
      </section>

      {/* About */}
      <section>
        <h3 className="text-sm font-semibold text-(--color-text-secondary) mb-3 uppercase tracking-wider">
          About
        </h3>
        <p className="text-sm text-(--color-text-secondary)">
          AGO Recipe Manager v0.1.0
        </p>
        <p className="text-xs text-(--color-text-tertiary) mt-1">
          Companion app for the AGO Film Processor by Vintage Visual.
        </p>
        <p className="text-xs text-(--color-text-tertiary) mt-2 leading-relaxed">
          Unofficial open-source project for the analog film community. Not an official Vintage Visual or AGO product.
        </p>
      </section>

      {/* Upload diagnostics */}
      <section className="mt-8">
        <h3 className="text-sm font-semibold text-(--color-text-secondary) mb-3 uppercase tracking-wider">
          Upload Diagnostics
        </h3>
        <p className="text-sm text-(--color-text-secondary) mb-3">
          Capture detailed upload attempts while on AGO WiFi, then inspect them
          here after reconnecting.
        </p>
        <div className="flex gap-2 mb-2">
          <button
            onClick={handleLoadUploadDebug}
            className="px-3 py-1.5 text-sm rounded-md border border-(--color-border) hover:bg-(--color-surface-hover) transition-colors"
          >
            Load Upload Log
          </button>
          <button
            onClick={handleClearUploadDebug}
            className="px-3 py-1.5 text-sm rounded-md border border-(--color-border) text-(--color-danger) hover:bg-(--color-danger)/10 transition-colors"
          >
            Clear Log
          </button>
        </div>
        <textarea
          value={uploadDebugLog}
          onChange={() => {}}
          readOnly
          rows={8}
          className="w-full px-3 py-2 text-xs font-mono rounded-md bg-(--color-surface-secondary) border border-(--color-border) text-(--color-text-primary) outline-none"
          placeholder="No diagnostics loaded yet."
        />
      </section>
    </div>
  );
}

function SettingField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-(--color-text-secondary) mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-1.5 text-sm rounded-md bg-(--color-surface-secondary) border border-(--color-border) text-(--color-text-primary) outline-none focus:border-(--color-accent)"
      />
    </div>
  );
}

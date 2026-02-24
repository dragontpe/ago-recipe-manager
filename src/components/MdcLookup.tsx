import { useState, useMemo, useRef, useEffect } from "react";
import { useAppStore } from "../lib/store";
import type { MdcEntry } from "../lib/types";
import mdcData from "../data/massive_dev_chart.json";

const allEntries = mdcData as MdcEntry[];

export function MdcLookup() {
  const applyMdcEntry = useAppStore((s) => s.applyMdcEntry);
  const recipes = useAppStore((s) => s.recipes);
  const selectedRecipeId = useAppStore((s) => s.selectedRecipeId);
  const selectRecipe = useAppStore((s) => s.selectRecipe);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const showToast = useAppStore((s) => s.showToast);

  const [filmQuery, setFilmQuery] = useState("");
  const [selectedFilm, setSelectedFilm] = useState("");
  const [devQuery, setDevQuery] = useState("");
  const [selectedDev, setSelectedDev] = useState("");
  const [filmFocused, setFilmFocused] = useState(false);
  const [devFocused, setDevFocused] = useState(false);
  const filmInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    filmInputRef.current?.focus();
  }, []);

  const allFilms = useMemo(() => {
    const set = new Set(allEntries.map((e) => e.film));
    return Array.from(set).sort();
  }, []);

  const filmSuggestions = useMemo(() => {
    if (!filmQuery || selectedFilm) return [];
    const q = filmQuery.toLowerCase();
    return allFilms.filter((f) => f.toLowerCase().includes(q)).slice(0, 12);
  }, [filmQuery, selectedFilm, allFilms]);

  const availableDevs = useMemo(() => {
    if (!selectedFilm) return [];
    const devs = new Set(
      allEntries.filter((e) => e.film === selectedFilm).map((e) => e.developer)
    );
    return Array.from(devs).sort();
  }, [selectedFilm]);

  const devSuggestions = useMemo(() => {
    if (!devQuery || selectedDev || !selectedFilm) return [];
    const q = devQuery.toLowerCase();
    return availableDevs.filter((d) => d.toLowerCase().includes(q)).slice(0, 12);
  }, [devQuery, selectedDev, selectedFilm, availableDevs]);

  const results = useMemo(() => {
    if (!selectedFilm) return [];
    let filtered = allEntries.filter((e) => e.film === selectedFilm);
    if (selectedDev) {
      filtered = filtered.filter((e) => e.developer === selectedDev);
    }
    return filtered;
  }, [selectedFilm, selectedDev]);

  const handleSelectFilm = (film: string) => {
    setSelectedFilm(film);
    setFilmQuery(film);
    setFilmFocused(false);
    setSelectedDev("");
    setDevQuery("");
  };

  const handleSelectDev = (dev: string) => {
    setSelectedDev(dev);
    setDevQuery(dev);
    setDevFocused(false);
  };

  const handleApply = async (entry: MdcEntry) => {
    if (!selectedRecipeId) {
      showToast("Select a recipe first (go to Recipes view)", "error");
      return;
    }
    await applyMdcEntry(selectedRecipeId, entry);
    selectRecipe(selectedRecipeId);
    setActiveView("recipes");
  };

  const handleClearFilm = () => {
    setFilmQuery("");
    setSelectedFilm("");
    setDevQuery("");
    setSelectedDev("");
    filmInputRef.current?.focus();
  };

  const handleClearDev = () => {
    setDevQuery("");
    setSelectedDev("");
  };

  const formatTime = (val: string) => {
    if (!val) return "-";
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    const min = Math.floor(num);
    const sec = Math.round((num - min) * 60);
    return sec > 0 ? `${min}:${sec.toString().padStart(2, "0")}` : `${min}:00`;
  };

  const targetRecipe = recipes.find((r) => r.id === selectedRecipeId);

  return (
    <div className="max-w-5xl mx-auto p-6 flex flex-col h-full">
      {/* Header */}
      <section className="rounded-3xl border border-(--color-border) bg-(--color-surface-secondary) p-6 mb-4">
        <p className="text-[11px] uppercase tracking-[0.16em] text-(--color-text-tertiary) mb-2">
          Massive Dev Chart
        </p>
        <h2 className="text-4xl leading-tight font-semibold text-(--color-text-primary)">
          Search Dev Times
        </h2>
        <p className="mt-2 text-sm text-(--color-text-secondary)">
          12,828 entries across 341 films and 234 developers.
          {targetRecipe
            ? ` Results will be applied to "${targetRecipe.name}".`
            : " Select a recipe first to apply results."}
        </p>
      </section>

      {/* Search fields */}
      <section className="rounded-3xl border border-(--color-border) bg-(--color-surface-secondary) p-5 mb-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Film search */}
          <div className="relative">
            <label className="block text-xs font-medium text-(--color-text-secondary) mb-1">
              Film
            </label>
            <div className="relative">
              <input
                ref={filmInputRef}
                type="text"
                value={filmQuery}
                onChange={(e) => {
                  setFilmQuery(e.target.value);
                  setSelectedFilm("");
                  setSelectedDev("");
                  setDevQuery("");
                }}
                onFocus={() => setFilmFocused(true)}
                onBlur={() => setTimeout(() => setFilmFocused(false), 150)}
                className="w-full px-3 py-2 pr-8 text-sm rounded-lg bg-(--color-surface) border border-(--color-border) text-(--color-text-primary) outline-none focus:border-(--color-accent)"
                placeholder="e.g. HP5, Tri-X, Delta..."
              />
              {filmQuery && (
                <button
                  onClick={handleClearFilm}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-(--color-text-tertiary) hover:text-(--color-text-primary)"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {filmFocused && filmSuggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full bg-(--color-surface) border border-(--color-border) rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filmSuggestions.map((f) => (
                  <li
                    key={f}
                    onMouseDown={() => handleSelectFilm(f)}
                    className="px-3 py-1.5 text-sm cursor-pointer hover:bg-(--color-surface-hover) text-(--color-text-primary)"
                  >
                    {f}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Developer search */}
          <div className="relative">
            <label className="block text-xs font-medium text-(--color-text-secondary) mb-1">
              Developer
            </label>
            <div className="relative">
              <input
                type="text"
                value={devQuery}
                onChange={(e) => {
                  setDevQuery(e.target.value);
                  setSelectedDev("");
                }}
                onFocus={() => setDevFocused(true)}
                onBlur={() => setTimeout(() => setDevFocused(false), 150)}
                disabled={!selectedFilm}
                className="w-full px-3 py-2 pr-8 text-sm rounded-lg bg-(--color-surface) border border-(--color-border) text-(--color-text-primary) outline-none focus:border-(--color-accent) disabled:opacity-40"
                placeholder={selectedFilm ? "e.g. Rodinal, HC-110..." : "Select a film first"}
              />
              {devQuery && (
                <button
                  onClick={handleClearDev}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-(--color-text-tertiary) hover:text-(--color-text-primary)"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {devFocused && devSuggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full bg-(--color-surface) border border-(--color-border) rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {devSuggestions.map((d) => (
                  <li
                    key={d}
                    onMouseDown={() => handleSelectDev(d)}
                    className="px-3 py-1.5 text-sm cursor-pointer hover:bg-(--color-surface-hover) text-(--color-text-primary)"
                  >
                    {d}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="rounded-3xl border border-(--color-border) bg-(--color-surface-secondary) p-5 flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-(--color-text-secondary) uppercase tracking-[0.08em]">
            Results
          </h3>
          <p className="text-xs text-(--color-text-tertiary)">
            {selectedFilm
              ? `${results.length} result${results.length !== 1 ? "s" : ""}`
              : "Start typing a film name"}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {selectedFilm && results.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-(--color-surface-secondary)">
                <tr className="text-xs text-(--color-text-tertiary) uppercase tracking-wider">
                  <th className="text-left py-1.5 font-medium">Developer</th>
                  <th className="text-left py-1.5 font-medium">Dilution</th>
                  <th className="text-left py-1.5 font-medium">ISO</th>
                  <th className="text-left py-1.5 font-medium">35mm</th>
                  <th className="text-left py-1.5 font-medium">120</th>
                  <th className="text-left py-1.5 font-medium">Temp</th>
                </tr>
              </thead>
              <tbody>
                {results.map((entry, i) => (
                  <tr
                    key={i}
                    onClick={() => handleApply(entry)}
                    className="cursor-pointer border-t border-(--color-border)/50 hover:bg-(--color-accent)/10 transition-colors"
                    title={targetRecipe ? `Apply to "${targetRecipe.name}"` : "Select a recipe first"}
                  >
                    <td className="py-2 text-(--color-text-primary) font-medium">
                      {entry.developer}
                    </td>
                    <td className="py-2 text-(--color-text-secondary)">
                      {entry.dilution || "-"}
                    </td>
                    <td className="py-2 text-(--color-text-secondary)">
                      {entry.iso}
                    </td>
                    <td className="py-2 text-(--color-text-primary) font-mono">
                      {formatTime(entry.time_35mm)}
                    </td>
                    <td className="py-2 text-(--color-text-secondary) font-mono">
                      {formatTime(entry.time_120)}
                    </td>
                    <td className="py-2 text-(--color-text-secondary)">
                      {entry.temp_c || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : selectedFilm && results.length === 0 ? (
            <p className="text-sm text-(--color-text-tertiary) text-center py-12">
              No results found
            </p>
          ) : (
            <p className="text-sm text-(--color-text-tertiary) text-center py-12">
              Type a film name above to search the Massive Dev Chart
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

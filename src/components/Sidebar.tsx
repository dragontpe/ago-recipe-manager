import { useAppStore } from "../lib/store";
import type { ViewType } from "../lib/types";
import { RecipeList } from "./RecipeList";

const NAV_ITEMS: { view: ViewType; label: string; icon: string }[] = [
  { view: "recipes", label: "Recipes", icon: "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" },
  { view: "massdev", label: "Search MassDev", icon: "m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" },
  { view: "connection", label: "AGO Connection", icon: "M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 0 1 1.06 0Z" },
  { view: "settings", label: "Settings", icon: "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" },
];

export function Sidebar() {
  const activeView = useAppStore((s) => s.activeView);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const wifiStatus = useAppStore((s) => s.wifiStatus);
  const currentSsid = useAppStore((s) => s.currentSsid);

  return (
    <aside className="w-64 h-full flex flex-col bg-(--color-surface-secondary) border-r border-(--color-border)">
      {/* Drag region for window title bar */}
      <div className="h-8 flex-shrink-0" data-tauri-drag-region />

      <div className="px-3 pb-3">
        <div className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2.5">
          <p className="text-xs uppercase tracking-[0.12em] text-(--color-text-tertiary)">
            AGO
          </p>
          <p className="text-sm font-semibold mt-0.5 text-(--color-text-primary)">
            Recipe Manager
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.view}
            onClick={() => setActiveView(item.view)}
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
              activeView === item.view
                ? "bg-(--color-surface-hover) text-(--color-text-primary) font-medium"
                : "text-(--color-text-secondary) hover:bg-(--color-surface-hover)"
            }`}
          >
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d={item.icon}
              />
            </svg>
            <span>{item.label}</span>
            {item.view === "connection" && (
              <span
                className={`ml-auto w-2 h-2 rounded-full ${
                  wifiStatus === "connected"
                    ? "bg-(--color-success)"
                    : wifiStatus === "connecting"
                      ? "bg-(--color-warning)"
                      : "bg-(--color-text-tertiary)"
                }`}
              />
            )}
          </button>
        ))}
      </nav>

      {/* Recipe list (visible when on recipes view) */}
      {activeView === "recipes" && (
        <>
          <div className="h-px bg-(--color-border) mx-2 my-2" />
          <RecipeList />
        </>
      )}

      <div className="mt-auto p-2 space-y-1.5">
        <div className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                wifiStatus === "connected"
                  ? "bg-(--color-success)"
                  : wifiStatus === "connecting"
                    ? "bg-(--color-warning)"
                    : "bg-(--color-text-tertiary)"
              }`}
            />
            <p className="text-xs font-medium text-(--color-text-secondary)">
              {wifiStatus === "connected"
                ? "AGO Connected"
                : wifiStatus === "connecting"
                  ? "Connecting"
                  : "AGO Disconnected"}
            </p>
          </div>
          <p className="text-[11px] mt-1 text-(--color-text-tertiary) truncate">
            {currentSsid ? `Network: ${currentSsid}` : "No active WiFi network"}
          </p>
        </div>
        <div className="px-3 py-1.5 text-[10px] text-(--color-text-tertiary) leading-relaxed">
          <p>v1.1.0 — Created by DragonTPE</p>
          <p>MIT License — Not an official Vintage Visual product</p>
        </div>
      </div>
    </aside>
  );
}

# AGO Recipe Manager — Project Handover

## What This Is

A macOS desktop app (Tauri v2 + React 19 + TypeScript + TailwindCSS v4) for managing B&W film development recipes for the AGO Film Processor by Vintage Visual. The AGO is a rotary film processor with a WiFi web interface. This app replaces the painful manual workflow of connecting to the device and using its clunky web forms.

## Project Location

```
~/ago-recipe-manager/
```

## Tech Stack

- **Tauri v2** (2.10.x) — Rust backend, system WKWebView, native .app packaging
- **React 19** + **TypeScript 5.9** — frontend
- **Vite 6** — bundler
- **TailwindCSS v4** — styling via `@tailwindcss/vite` plugin (no `tailwind.config.js`, uses CSS-based config in `src/styles/globals.css`)
- **Zustand 5** — state management (single store in `src/lib/store.ts`)
- **@dnd-kit** (core 6 + sortable 10) — drag-and-drop step reordering
- **tauri-plugin-sql** (SQLite) — local database for recipes, steps, settings
- **tauri-plugin-dialog** — native file open/save dialogs for import/export
- **reqwest** (0.12, with multipart + rustls-tls) — HTTP upload to AGO device

## How to Run

```bash
cd ~/ago-recipe-manager
npx tauri dev          # dev mode with hot reload + devtools
npx tauri build        # release build -> .app and .dmg
```

Dev mode opens devtools automatically (configured in `src-tauri/src/lib.rs` behind `#[cfg(debug_assertions)]`).

The built app goes to:
- `src-tauri/target/release/bundle/macos/AGO Recipe Manager.app`
- `src-tauri/target/release/bundle/dmg/AGO Recipe Manager_0.1.0_aarch64.dmg`

Currently installed at `/Applications/AGO Recipe Manager.app`.

## Architecture

### Frontend (`src/`)

```
src/
├── main.tsx                    # React entry (StrictMode enabled)
├── App.tsx                     # Layout shell with ErrorBoundary, sidebar + main panel
├── styles/globals.css          # TailwindCSS v4 config, custom properties for theming, dark mode
├── lib/
│   ├── types.ts                # Recipe, Step, AgoRecipeJson, AppSettings, ViewType interfaces
│   ├── constants.ts            # Developer list, step names, agitation/compensation options, default step factory, DEFAULT_SETTINGS
│   ├── db.ts                   # All SQLite queries via @tauri-apps/plugin-sql (CRUD for recipes, steps, settings)
│   ├── store.ts                # Zustand store — app state, all actions with debounced writes (300ms)
│   └── ago-format.ts           # Bidirectional conversion: internal Recipe <-> AGO JSON format (with smart developer/film stock parsing on import)
├── components/
│   ├── Sidebar.tsx             # Nav items + AGO status card at bottom showing connection state and current SSID
│   ├── RecipeList.tsx          # "New Recipe" button, search input, sort dropdown (modified/created/name), recipe list
│   ├── RecipeEditor.tsx        # Recipe form with action buttons (Upload to AGO, Export, Duplicate, Delete)
│   ├── StepList.tsx            # dnd-kit sortable wrapper, "add step" buttons per step type
│   ├── StepEditor.tsx          # Single step row with DEV step highlight styling
│   ├── AgoConnection.tsx       # WiFi status, connect/disconnect, AGO SSID/IP display, webview launcher
│   ├── Settings.tsx            # All settings including upload endpoint/field config, import button
│   ├── EmptyState.tsx          # Card-style empty state
│   └── Toast.tsx               # Transient notification (auto-dismisses 3s)
```

### Backend (`src-tauri/`)

```
src-tauri/
├── Cargo.toml                  # Dependencies: tauri 2 (devtools), tauri-plugin-sql (sqlite), tauri-plugin-dialog, reqwest (multipart, rustls-tls)
├── tauri.conf.json             # App config: window 1100x700, min 800x500, CSP null, SQL preload
├── capabilities/default.json   # Permissions: core:default, core:window:allow-create, sql:default, sql:allow-execute, dialog:default
├── src/
│   ├── main.rs                 # Generated entry point, calls lib::run()
│   ├── lib.rs                  # Tauri builder: registers plugins (sql with migrations, dialog, log), setup (devtools in debug), invoke_handler
│   ├── migrations.rs           # SQLite schema v1 (tables) + v2 (upload settings)
│   └── commands/
│       ├── mod.rs              # Module declarations
│       ├── wifi.rs             # 4 commands: wifi_get_interface, wifi_get_current_network, wifi_connect, wifi_reconnect
│       └── export.rs           # 3 commands: export_recipe_file, import_recipe_file, upload_recipe_file (multipart POST with field name fallback)
```

## Database Schema (SQLite)

File location: Tauri app data directory, name `ago_recipes.db`. Created automatically on first launch via migrations.

```sql
-- Migration v1: initial schema
-- recipes table
id TEXT PRIMARY KEY,          -- UUID v4 (generated client-side)
name TEXT NOT NULL,
film_stock TEXT NOT NULL DEFAULT '',
developer TEXT NOT NULL DEFAULT '',
dilution TEXT NOT NULL DEFAULT '',
category TEXT NOT NULL DEFAULT 'BW',
notes TEXT NOT NULL DEFAULT '',
created_at TEXT NOT NULL,     -- ISO 8601
updated_at TEXT NOT NULL      -- ISO 8601

-- steps table (multiple per recipe, ordered by sort_order)
id TEXT PRIMARY KEY,          -- UUID v4
recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
sort_order INTEGER NOT NULL DEFAULT 0,
name TEXT NOT NULL DEFAULT 'DEV',       -- Max 5 chars: DEV, STOP, FIX, BLIX, RINSE, PRE, WASH
time_min INTEGER NOT NULL DEFAULT 0,
time_sec INTEGER NOT NULL DEFAULT 0,
agitation TEXT NOT NULL DEFAULT 'Roll',  -- Roll, Stick, Stand, Off
compensation TEXT NOT NULL DEFAULT 'Off', -- On, Mon, Off
min_temperature REAL NOT NULL DEFAULT 18,
rated_temperature REAL NOT NULL DEFAULT 20,
max_temperature REAL NOT NULL DEFAULT 24,
formula_designator TEXT NOT NULL DEFAULT '',  -- "1.1.1" for B&W compensation
logo_text TEXT NOT NULL DEFAULT ''

-- settings table (key-value pairs)
key TEXT PRIMARY KEY,
value TEXT NOT NULL
-- Seeded keys: ago_ip, ago_ssid, ago_password, default_min_temp, default_rated_temp,
--   default_max_temp, export_folder, auto_reconnect, ago_upload_endpoint, ago_upload_field

-- Migration v2 adds: ago_upload_endpoint ('/upload'), ago_upload_field ('file')
```

## AGO JSON Format

The AGO device expects this exact format for custom program files:

```json
{
  "category": "BW",
  "name": "B&W",
  "expanded_title": " - Retro 400S 510 Pyro 1+100",
  "steps": [
    {
      "name": "DEV",
      "time_min": 6,
      "time_sec": 30,
      "agitation": "Roll",
      "compensation": "On",
      "min_temperature": 18,
      "rated_temperature": 20,
      "max_temperature": 24,
      "formula_designator": "1.1.1",
      "logo_text": "B&W DEV"
    }
  ]
}
```

Conversion logic is in `src/lib/ago-format.ts` (`recipeToAgoJson` and `agoJsonToRecipeData`). Import parsing uses the DEVELOPERS constant list to intelligently split film stock from developer name in the `expanded_title`.

## Data Flow

1. **All recipe/step/settings CRUD** goes through `src/lib/db.ts` which uses `@tauri-apps/plugin-sql` (JS-side SQL queries, no Rust commands needed for DB ops)
2. **Zustand store** (`src/lib/store.ts`) wraps db.ts calls with debounced writes (300ms) and optimistic UI updates
3. **WiFi and file operations** go through Rust Tauri commands (`invoke()` from frontend -> Rust handler)
4. **Upload** uses `reqwest` multipart POST in Rust, tries configured field name first then falls back to common names (file, upload, program, json)

## Key Design Decisions

- **Debounced writes**: Recipe and step field updates are debounced at 300ms with optimistic local state updates. Pending updates are merged and flushed together. Delete operations cancel any pending timers.
- **CSP disabled** (`null`): Restrictive CSP was breaking script execution in the Tauri webview. Fine for a local desktop app.
- **`sql:allow-execute` required**: The `sql:default` permission only grants read ops. Without explicit `sql:allow-execute` in capabilities, all writes silently fail.
- **Upload fallback**: The `upload_recipe_file` command tries multiple form field names if the configured one fails, since the AGO's exact upload API hasn't been reverse-engineered.

## Known Issues / Quirks

1. **WiFi commands untested** — the `wifi.rs` commands use `networksetup` which may require admin privileges on newer macOS. Not tested against an actual AGO device.

2. **`export.rs` uses `blocking_save_file` / `blocking_pick_file`** — synchronous dialog calls inside async Tauri commands. Works but could theoretically block.

3. **React StrictMode** double-invokes effects in dev mode — `loadRecipes()` runs twice on mount. No functional issue.

4. **Rust build warnings** — 2 warnings about unused imports in `lib.rs` (the `Manager` trait import is only used in debug builds). Harmless.

5. **AGO upload endpoint unknown** — the exact HTTP endpoint and field name the AGO expects hasn't been documented. The upload command does best-effort multipart POST with fallback field names.

## What's Working

- Create, edit, delete, duplicate recipes
- Debounced auto-save with optimistic UI updates
- Add/remove/reorder processing steps via drag-and-drop
- DEV steps visually highlighted with accent color
- Export recipes as AGO-format JSON files (native save dialog)
- Import AGO JSON files with smart film/developer parsing
- Search/filter recipes by name, film stock, or developer
- Sort recipes by date modified, date created, or name
- Upload to AGO via multipart HTTP POST (with field name fallback)
- Settings persistence (AGO IP, SSID, password, upload endpoint/field, default temperatures)
- Dark mode (follows system preference)
- Error boundary catches and displays React errors
- Toast notifications for user feedback
- AGO connection status card in sidebar footer

## What's Not Yet Implemented

- **App icon** — using default Tauri icon
- **AGO webview** — button exists, creates a Tauri WebviewWindow at `http://{ago_ip}`, untested without device
- **Recipe version history, batch upload, C-41/E-6 support, MDC integration** — stretch goals from the original spec

## Key Files for Debugging

| What | File |
|------|------|
| App state + all actions + debounce logic | `src/lib/store.ts` |
| All DB queries | `src/lib/db.ts` |
| AGO format conversion | `src/lib/ago-format.ts` |
| Tauri plugin wiring + command registration | `src-tauri/src/lib.rs` |
| DB schema + migrations | `src-tauri/src/migrations.rs` |
| Permissions (critical for writes!) | `src-tauri/capabilities/default.json` |
| WiFi system calls | `src-tauri/src/commands/wifi.rs` |
| File export/import + HTTP upload | `src-tauri/src/commands/export.rs` |
| Tailwind theme + dark mode | `src/styles/globals.css` |
| Default settings + step factory | `src/lib/constants.ts` |

## Original Spec

The full project specification is in the prompt that created this project. Key points:
- AGO WiFi: SSID `AGO`, password `12345678`, IP `10.10.10.1`
- Step name max 5 chars, agitation values capitalized (Roll/Stick/Stand/Off)
- Compensation: On (active), Mon (monitor only), Off
- Formula designator `1.1.1` for B&W general compensation
- AGO JSON filename max 31 chars including `.json` extension
- Category `BW` enables automatic time reduction on AGO device

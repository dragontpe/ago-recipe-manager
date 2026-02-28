# Codex Handover: AGO Recipe Manager — Upload Tracking Bug

## Project Overview
- **Path:** `~/ago-recipe-manager/`
- **Stack:** Tauri 2 (Rust backend) + React + TypeScript + Vite + Tailwind CSS + SQLite
- **What it does:** Desktop companion app for the AGO film processor. Manages development recipes and uploads them to the AGO device over WiFi.

## Current Bug
The "Uploaded Programs" section on the AGO Connection page (`src/components/AgoPrograms.tsx`) shows correctly but never displays any uploaded programs. After uploading a recipe via the "Upload to AGO" button, nothing appears in the list.

## What Was Built (This Session)

### 1. Splash Screen (working fine)
- `src/components/SplashScreen.tsx` — 5-second splash with fade-out
- `src/assets/splash.png` — splash image
- Wired into `src/App.tsx`

### 2. Upload Tracking + Delete from AGO (the buggy part)

**Database migration** (`src-tauri/src/migrations.rs`, migration v4):
```sql
CREATE TABLE IF NOT EXISTS ago_uploads (
    id              TEXT PRIMARY KEY,
    recipe_id       TEXT REFERENCES recipes(id) ON DELETE SET NULL,
    filename        TEXT NOT NULL,
    display_name    TEXT NOT NULL,
    uploaded_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**DB functions** (`src/lib/db.ts` — bottom of file):
- `fetchAgoUploads()` — SELECT * FROM ago_uploads ORDER BY uploaded_at DESC
- `insertAgoUpload(upload)` — INSERT into ago_uploads
- `deleteAgoUpload(id)` — DELETE from ago_uploads

**Upload recording** (`src/components/RecipeEditor.tsx`, `handleUpload`):
- After successful `invoke("upload_recipe_file", ...)`, calls `insertAgoUpload()` to record the filename
- The Rust command `upload_recipe_file` now returns `UploadResult { message, ago_filename }` instead of a plain string

**Display + Delete UI** (`src/components/AgoPrograms.tsx`):
- Mounted in `src/components/AgoConnection.tsx` between "AGO Web Interface" and "Manual connection instructions"
- Fetches uploads from local DB on mount via `useEffect`
- Delete button sends `invoke("delete_ago_program", { ip, filename })` (HTTP DELETE to AGO) then removes local record

**Rust changes** (`src-tauri/src/commands/export.rs`):
- `upload_recipe_file` return type changed from `Result<String, String>` to `Result<UploadResult, String>`
- `UploadResult` struct: `{ message: String, ago_filename: String }`
- `delete_ago_program` command: sends HTTP DELETE to `http://{ip}/api/files/programs/custom/{filename}`

**Registered commands** (`src-tauri/src/lib.rs`):
- `delete_ago_program` is registered in `invoke_handler`

## Likely Bug Locations (in order of probability)

### 1. `RecipeEditor.tsx` — `handleUpload` may not be receiving `UploadResult` correctly
The invoke call was changed from `invoke<string>` to `invoke<{ message: string; ago_filename: string }>`. If Tauri serializes the Rust `UploadResult` with different casing (e.g., `agoFilename` vs `ago_filename`), the `result.ago_filename` could be undefined, causing `insertAgoUpload` to fail silently. **Check:** Tauri's serde serialization uses camelCase by default for command returns — so the field might arrive as `agoFilename` not `ago_filename`.

### 2. `AgoPrograms.tsx` — no refresh after upload
The component fetches uploads once on mount (`useEffect([], [])`). If you upload a recipe from the Recipes page and then navigate to AGO Connection, the component remounts and should re-fetch. BUT if you're already on the Connection page, there's no mechanism to detect new uploads. This is less likely the main bug since you'd typically upload then navigate.

### 3. Migration v4 may not have run
If the app was previously installed and the DB already exists, the migration should auto-run on startup via `tauri_plugin_sql`. But worth verifying the table exists — check the SQLite DB at the app's data directory.

### 4. `insertAgoUpload` may be silently failing
The function doesn't surface errors to the user — the `handleUpload` in RecipeEditor.tsx doesn't catch errors from `insertAgoUpload` separately. If it throws, the toast still says "Recipe uploaded to AGO" because the upload itself succeeded.

## How to Debug

1. **Check browser console** (Cmd+Option+I in the Tauri dev window via `npm run tauri dev`):
   - Look for errors after clicking "Upload to AGO"
   - Check if `insertAgoUpload` throws

2. **Check the Rust return type serialization:**
   - In `handleUpload`, add `console.log("upload result:", result)` after the invoke call
   - Verify field names match (`ago_filename` vs `agoFilename`)

3. **Check the DB directly:**
   - The SQLite DB is at: `~/Library/Application Support/com.francoisdekock.ago-recipe-manager/ago_recipes.db`
   - Run: `sqlite3 ~/Library/Application\ Support/com.francoisdekock.ago-recipe-manager/ago_recipes.db "SELECT * FROM ago_uploads;"`
   - If the table doesn't exist, migration v4 didn't run

4. **Check if `fetchAgoUploads` returns data:**
   - In `AgoPrograms.tsx`, add logging in the useEffect

## Key Files
| File | Purpose |
|------|---------|
| `src/components/RecipeEditor.tsx` | Upload handler (writes to ago_uploads after upload) |
| `src/components/AgoPrograms.tsx` | Displays uploaded programs list + delete |
| `src/components/AgoConnection.tsx` | Parent page that includes AgoPrograms |
| `src/lib/db.ts` | All SQLite operations including ago_uploads CRUD |
| `src-tauri/src/commands/export.rs` | Rust: upload_recipe_file, delete_ago_program |
| `src-tauri/src/migrations.rs` | DB schema migrations (v4 = ago_uploads table) |
| `src-tauri/src/lib.rs` | Tauri command registration |

## AGO Device API (from network inspection)
- **No list endpoint** — the AGO web UI fetches each program file individually
- **Upload:** POST to `http://{ip}/api/files/programs/custom/_P_C0_{token}.txt` with JSON body
- **Delete:** Should be DELETE to same URL (untested — this is the assumption)
- **Stored programs:** at `/api/files/programs/stored/_P_P*.txt` (built-in, read-only)
- **Custom programs:** at `/api/files/programs/custom/_P_C*.txt`

## My Best Guess
The #1 suspect is **Tauri's camelCase serialization**. The Rust struct has `ago_filename` but Tauri's default serde config serializes to `agoFilename`. Fix: either rename the Rust field, add `#[serde(rename_all = "camelCase")]` to the struct, or update the TypeScript to use `result.agoFilename`.

# AGO Recipe Manager

A macOS desktop companion app for the [AGO Film Processor](https://vintagevisual.co/) by Vintage Visual. Build, store, and manage your B&W film development recipes offline, then connect to the AGO and upload them when ready.

Unofficial open-source project for the analog film community. Not an official Vintage Visual or AGO product.

![Platform](https://img.shields.io/badge/platform-macOS-lightgrey)
![Built with](https://img.shields.io/badge/built%20with-Tauri%20v2-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Why This Exists

The AGO's current workflow for uploading custom development programs is painful: enable WiFi on the device, manually switch your Mac's WiFi to the AGO network, open a browser, type in the IP address, then use a clunky web form. This app eliminates that friction entirely.

## Features

### Recipe Library
- Create, edit, duplicate, and delete development recipes
- Pre-populated default template (DEV / FIX / RINSE) for quick setup
- Drag-and-drop step reordering
- Search and filter by film stock, developer, or recipe name
- Sort by date modified, date created, or name (A-Z)
- Auto-save with debounced writes

### Processing Steps
Each step in a recipe maps directly to an AGO program step:
- **Step types**: DEV, STOP, FIX, BLIX, RINSE, PRE, WASH
- **Agitation**: Roll, Stick, Stand, Off
- **Compensation**: On (active time adjustment), Mon (monitor only), Off
- **Temperature**: Min / Rated / Max in Celsius
- **Formula designator**: B&W compensation curve (default `1.1.1`)

### AGO Connection
- One-click WiFi connect to the AGO network via `networksetup`
- Auto-detect WiFi interface
- Connection status indicator in sidebar
- Auto-reconnect to previous network on disconnect
- Embedded AGO web interface viewer (opens in separate window)

### Export, Import & Upload
- Export recipes as AGO-format `.json` files via native save dialog
- Import AGO program files back into the library with smart parsing
- Direct HTTP upload to AGO device (multipart POST with field name fallback)

### Settings
- Configurable AGO IP address, WiFi SSID, and password
- Upload endpoint and form field configuration
- Default temperature range for new recipes
- Auto-reconnect toggle

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Tauri v2](https://v2.tauri.app/) |
| Frontend | React 19, TypeScript 5.9, Vite 6 |
| Styling | TailwindCSS v4 |
| State | Zustand 5 |
| Database | SQLite via tauri-plugin-sql |
| Drag & Drop | @dnd-kit |
| HTTP | reqwest (Rust, multipart uploads) |
| Dialogs | tauri-plugin-dialog (native file open/save) |

## Prerequisites

- **macOS** (Apple Silicon or Intel)
- **Node.js** 18+ and npm
- **Rust** stable toolchain (install via [rustup](https://rustup.rs/))
- **Xcode Command Line Tools**

## Getting Started

```bash
# Clone the repo
git clone https://github.com/dragontpe/ago-recipe-manager.git
cd ago-recipe-manager

# Install dependencies
npm install

# Run in development mode (hot reload + devtools)
npx tauri dev

# Build for production
npx tauri build
```

The production build outputs:
- `.app` bundle: `src-tauri/target/release/bundle/macos/AGO Recipe Manager.app`
- `.dmg` installer: `src-tauri/target/release/bundle/dmg/`

## Usage

1. Create recipes in the **Recipes** view
2. Configure AGO connection details in **Settings**:
   - AGO IP (default `10.10.10.1`)
   - AGO SSID / password (default `AGO` / `12345678`)
   - Upload endpoint and field name overrides
3. Go to **AGO Connection** and click **Connect to AGO**
4. In a recipe, use:
   - **Upload to AGO** for direct HTTP upload
   - **Export** to save as `.json` for manual upload fallback
5. Use **Import Recipe from JSON** in Settings to bring AGO files into the library

## AGO Program Format

The app generates JSON files in the exact format the AGO expects:

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
    },
    {
      "name": "FIX",
      "time_min": 5,
      "time_sec": 0,
      "agitation": "Roll",
      "compensation": "Off",
      "min_temperature": 18,
      "rated_temperature": 20,
      "max_temperature": 24,
      "formula_designator": "",
      "logo_text": ""
    }
  ]
}
```

## Default Developers

The app ships with a pre-loaded developer suggestion list (you can type any custom entry):
- 510 Pyro, FX-39, HC-110, DDX, Xtol, Rodinal

## Project Structure

```
ago-recipe-manager/
├── src/                        # React frontend
│   ├── lib/                    # Data layer (types, db, store, AGO format)
│   ├── components/             # UI components
│   └── styles/                 # TailwindCSS theme & dark mode
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   ├── commands/           # WiFi, export, upload commands
│   │   ├── lib.rs              # Tauri app builder
│   │   └── migrations.rs       # SQLite schema
│   ├── capabilities/           # Tauri permissions
│   └── Cargo.toml
├── CODEX.md                    # Detailed technical handover document
└── README.md
```

## Notes

- AGO upload endpoint/field names can vary by firmware. If upload fails, export the JSON and upload manually through the AGO web UI.
- While connected to AGO WiFi, internet access is unavailable. The app works fully offline for recipe management.
- WiFi auto-connect uses macOS `networksetup` and may require permissions on newer macOS versions. Manual connection instructions are provided as a fallback.

## Roadmap

- [ ] App icon
- [ ] Massive Dev Chart integration (auto-lookup development times)
- [ ] C-41 and E-6 recipe support
- [ ] Recipe version history
- [ ] Batch upload (multiple recipes at once)
- [ ] Recipe sharing via QR code or URL
- [ ] Print-friendly recipe cards

## License

MIT

## Acknowledgements

Built for the AGO Film Processor by [Vintage Visual](https://vintagevisual.co/).

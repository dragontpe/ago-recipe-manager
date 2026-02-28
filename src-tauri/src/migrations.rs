use tauri_plugin_sql::{Migration, MigrationKind};

pub fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create initial tables",
            sql: r#"
            CREATE TABLE IF NOT EXISTS recipes (
                id              TEXT PRIMARY KEY,
                name            TEXT NOT NULL,
                film_stock      TEXT NOT NULL DEFAULT '',
                developer       TEXT NOT NULL DEFAULT '',
                dilution        TEXT NOT NULL DEFAULT '',
                category        TEXT NOT NULL DEFAULT 'BW',
                notes           TEXT NOT NULL DEFAULT '',
                created_at      TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS steps (
                id                  TEXT PRIMARY KEY,
                recipe_id           TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
                sort_order          INTEGER NOT NULL DEFAULT 0,
                name                TEXT NOT NULL DEFAULT 'DEV',
                time_min            INTEGER NOT NULL DEFAULT 0,
                time_sec            INTEGER NOT NULL DEFAULT 0,
                agitation           TEXT NOT NULL DEFAULT 'Roll',
                compensation        TEXT NOT NULL DEFAULT 'Off',
                min_temperature     REAL NOT NULL DEFAULT 18,
                rated_temperature   REAL NOT NULL DEFAULT 20,
                max_temperature     REAL NOT NULL DEFAULT 24,
                formula_designator  TEXT NOT NULL DEFAULT '',
                logo_text           TEXT NOT NULL DEFAULT ''
            );

            CREATE INDEX IF NOT EXISTS idx_steps_recipe ON steps(recipe_id, sort_order);

            CREATE TABLE IF NOT EXISTS settings (
                key     TEXT PRIMARY KEY,
                value   TEXT NOT NULL
            );

            INSERT OR IGNORE INTO settings (key, value) VALUES
                ('ago_ip', '10.10.10.1'),
                ('ago_ssid', 'AGO'),
                ('ago_password', '12345678'),
                ('default_min_temp', '18'),
                ('default_rated_temp', '20'),
                ('default_max_temp', '24'),
                ('export_folder', ''),
                ('auto_reconnect', 'true');
        "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add upload settings",
            sql: r#"
            INSERT OR IGNORE INTO settings (key, value) VALUES
                ('ago_upload_endpoint', '/upload'),
                ('ago_upload_field', 'file');
        "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add dev_time_reduced flag to recipes",
            sql: r#"
            ALTER TABLE recipes ADD COLUMN dev_time_reduced INTEGER NOT NULL DEFAULT 0;
        "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "track programs uploaded to AGO",
            sql: r#"
            CREATE TABLE IF NOT EXISTS ago_uploads (
                id              TEXT PRIMARY KEY,
                recipe_id       TEXT REFERENCES recipes(id) ON DELETE SET NULL,
                filename        TEXT NOT NULL,
                display_name    TEXT NOT NULL,
                uploaded_at     TEXT NOT NULL DEFAULT (datetime('now'))
            );
        "#,
            kind: MigrationKind::Up,
        },
    ]
}

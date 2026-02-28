use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use std::fs;
use std::fs::OpenOptions;
use std::io::Write;
use std::time::Duration;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri_plugin_dialog::DialogExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgoProgram {
    pub filename: String,
    pub display_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadResult {
    pub message: String,
    pub ago_filename: String,
}

const UPLOAD_DEBUG_LOG_PATH: &str = "/tmp/ago-recipe-manager-upload-debug.log";

fn append_upload_debug(lines: &[String]) {
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open(UPLOAD_DEBUG_LOG_PATH)
    {
        let _ = writeln!(file, "=== upload {} ===", ts);
        for line in lines {
            let _ = writeln!(file, "{}", line);
        }
        let _ = writeln!(file);
    }
}

fn normalize_url(ip: &str, endpoint: &str) -> String {
    if endpoint.starts_with("http://") || endpoint.starts_with("https://") {
        endpoint.to_string()
    } else if endpoint.starts_with('/') {
        format!("http://{}{}", ip, endpoint)
    } else {
        format!("http://{}/{}", ip, endpoint)
    }
}

fn to_string_field(value: &Value, key: &str) -> String {
    value
        .get(key)
        .and_then(Value::as_str)
        .unwrap_or_default()
        .trim()
        .to_string()
}

fn to_i64_field(value: &Value, key: &str) -> i64 {
    value
        .get(key)
        .and_then(Value::as_i64)
        .unwrap_or(0)
}

fn to_f64_field(value: &Value, key: &str) -> f64 {
    value
        .get(key)
        .and_then(Value::as_f64)
        .unwrap_or(0.0)
}

fn sanitize_name_from_filename(filename: &str) -> String {
    let stem = filename.strip_suffix(".json").unwrap_or(filename);
    let cleaned = stem
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '_' || c == '-' {
                c
            } else {
                '_'
            }
        })
        .collect::<String>()
        .trim_matches('_')
        .replace('_', " ");

    if cleaned.is_empty() {
        "Custom Program".to_string()
    } else {
        cleaned
    }
}

fn short_upload_token() -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let hex = format!("{:x}", nanos);
    let mut token = hex.chars().rev().take(8).collect::<String>();
    token = token.chars().rev().collect::<String>();
    while token.len() < 8 {
        token.insert(0, '0');
    }
    token
}

fn build_custom_program_filename() -> String {
    format!("_P_C0_{}.txt", short_upload_token())
}

fn looks_like_html(body: &str) -> bool {
    let lower = body.trim().to_lowercase();
    lower.contains("<!doctype html") || lower.contains("<html")
}

fn build_custom_program_payload(
    json_content: &str,
    filename: &str,
    film_stock: &str,
    developer: &str,
    dilution: &str,
) -> Result<Value, String> {
    let parsed: Value =
        serde_json::from_str(json_content).map_err(|e| format!("Invalid recipe JSON: {}", e))?;

    let source_steps = parsed
        .get("steps")
        .and_then(Value::as_array)
        .ok_or_else(|| "Recipe JSON missing steps array".to_string())?;

    let category = {
        let raw = to_string_field(&parsed, "category");
        if raw.is_empty() {
            "BW".to_string()
        } else {
            raw
        }
    };

    let name = if film_stock.trim().is_empty() {
        sanitize_name_from_filename(filename)
    } else {
        film_stock.trim().to_string()
    };

    let expanded_title = if developer.trim().is_empty() && dilution.trim().is_empty() {
        let existing = to_string_field(&parsed, "expanded_title");
        if existing.is_empty() {
            String::new()
        } else if existing.starts_with(" -") || existing.starts_with('-') {
            existing
        } else {
            format!(" - {}", existing)
        }
    } else {
        let mut parts = Vec::new();
        if !developer.trim().is_empty() {
            parts.push(developer.trim().to_string());
        }
        if !dilution.trim().is_empty() {
            parts.push(dilution.trim().to_string());
        }
        format!(" - {}", parts.join(" "))
    };

    let mut steps = Vec::with_capacity(source_steps.len());
    for step in source_steps {
        let time = if step.get("time").is_some() {
            to_i64_field(step, "time")
        } else {
            (to_i64_field(step, "time_min") * 60) + to_i64_field(step, "time_sec")
        };

        let mut out = Map::new();
        out.insert("name".to_string(), json!(to_string_field(step, "name")));
        out.insert("time".to_string(), json!(time.max(0)));

        let agitation = to_string_field(step, "agitation");
        out.insert(
            "agitation".to_string(),
            json!(if agitation.is_empty() { "Roll" } else { &agitation }),
        );

        let compensation = to_string_field(step, "compensation");
        out.insert(
            "compensation".to_string(),
            json!(if compensation.is_empty() {
                "Off"
            } else {
                &compensation
            }),
        );

        let formula = to_string_field(step, "formula_designator");
        if !formula.is_empty() {
            out.insert("formula_designator".to_string(), json!(formula));
        }

        if compensation != "Off" {
            let min_temp = if step.get("min_temperature").is_some() {
                to_f64_field(step, "min_temperature")
            } else {
                18.0
            };
            let max_temp = if step.get("max_temperature").is_some() {
                to_f64_field(step, "max_temperature")
            } else {
                24.0
            };
            out.insert("min_temperature".to_string(), json!(min_temp));
            out.insert("max_temperature".to_string(), json!(max_temp));
        }

        steps.push(Value::Object(out));
    }

    Ok(json!({
        "name": name,
        "designator": "C2",
        "category": category,
        "expanded_title": expanded_title,
        "steps": steps,
    }))
}

async fn response_text(resp: reqwest::Response) -> String {
    resp.text().await.unwrap_or_default()
}

#[tauri::command]
pub async fn export_recipe_file(
    app: tauri::AppHandle,
    json_content: String,
    default_name: String,
) -> Result<String, String> {
    let file_path = app
        .dialog()
        .file()
        .set_file_name(&default_name)
        .add_filter("JSON", &["json"])
        .blocking_save_file();

    match file_path {
        Some(path) => {
            let path_str = path.to_string();
            fs::write(&path_str, &json_content)
                .map_err(|e| format!("Failed to write file: {}", e))?;
            Ok(path_str)
        }
        None => Err("Export cancelled".to_string()),
    }
}

#[tauri::command]
pub async fn import_recipe_file(app: tauri::AppHandle) -> Result<String, String> {
    let file_path = app
        .dialog()
        .file()
        .add_filter("JSON", &["json"])
        .blocking_pick_file();

    match file_path {
        Some(path) => {
            let path_str = path.to_string();
            let content =
                fs::read_to_string(&path_str).map_err(|e| format!("Failed to read file: {}", e))?;
            Ok(content)
        }
        None => Err("Import cancelled".to_string()),
    }
}

#[tauri::command]
pub async fn upload_recipe_file(
    ip: String,
    endpoint: String,
    _field_name: String,
    filename: String,
    json_content: String,
    film_stock: String,
    developer: String,
    dilution: String,
) -> Result<UploadResult, String> {
    let mut debug_lines = vec![
        format!("ip={}", ip),
        format!("endpoint_setting={}", endpoint),
        format!("field_setting={}", _field_name),
        format!("filename={}", filename),
    ];

    let client = reqwest::Client::builder()
        .cookie_store(true)
        .timeout(Duration::from_secs(12))
        .build()
        .map_err(|e| {
            let msg = format!("Failed to create HTTP client: {}", e);
            append_upload_debug(&[msg.clone()]);
            msg
        })?;

    let payload = build_custom_program_payload(
        &json_content,
        &filename,
        &film_stock,
        &developer,
        &dilution,
    )?;
    let payload_text = serde_json::to_string(&payload).map_err(|e| format!("Failed to serialize upload payload: {}", e))?;
    let payload_snippet = payload_text
        .chars()
        .take(360)
        .collect::<String>();
    debug_lines.push(format!("custom_payload={}", payload_snippet));

    let custom_filename = build_custom_program_filename();
    let custom_url = format!("http://{}/api/files/programs/custom/{}", ip, custom_filename);
    debug_lines.push(format!("primary_url={}", custom_url));

    let mut attempts = Vec::new();

    let primary_resp = client
        .post(&custom_url)
        .header("Accept", "application/json, text/plain, */*")
        .header("Origin", format!("http://{}", ip))
        .header("Referer", format!("http://{}/programs", ip))
        .header("Content-Type", "application/json")
        .body(payload_text.clone())
        .send()
        .await;

    match primary_resp {
        Ok(resp) => {
            let status = resp.status();
            let body = response_text(resp).await;
            let snippet = body.chars().take(180).collect::<String>();
            if status.is_success() && !looks_like_html(&body) {
                let msg = format!(
                    "Uploaded {} to AGO as {} via API",
                    filename, custom_filename
                );
                debug_lines.push(format!("success={}", msg));
                debug_lines.push(format!("primary_status={}", status));
                debug_lines.push(format!("primary_body={}", snippet));
                append_upload_debug(&debug_lines);
                return Ok(UploadResult { message: msg, ago_filename: custom_filename.clone() });
            }
            attempts.push(format!(
                "POST {} -> HTTP {} ({})",
                custom_url, status, snippet
            ));
        }
        Err(e) => {
            attempts.push(format!("POST {} -> {}", custom_url, e));
        }
    }

    // PUT fallback for firmware variants that write by direct resource path.
    let put_resp = client
        .put(&custom_url)
        .header("Content-Type", "application/json")
        .body(payload_text.clone())
        .send()
        .await;

    match put_resp {
        Ok(resp) => {
            let status = resp.status();
            let body = response_text(resp).await;
            let snippet = body.chars().take(180).collect::<String>();
            if status.is_success() && !looks_like_html(&body) {
                let msg = format!(
                    "Uploaded {} to AGO as {} via API (PUT)",
                    filename, custom_filename
                );
                debug_lines.push(format!("success={}", msg));
                debug_lines.push(format!("put_status={}", status));
                debug_lines.push(format!("put_body={}", snippet));
                append_upload_debug(&debug_lines);
                return Ok(UploadResult { message: msg, ago_filename: custom_filename.clone() });
            }
            attempts.push(format!("PUT {} -> HTTP {} ({})", custom_url, status, snippet));
        }
        Err(e) => {
            attempts.push(format!("PUT {} -> {}", custom_url, e));
        }
    }

    // Optional compatibility fallback if user explicitly overrides endpoint.
    if !endpoint.trim().is_empty() && endpoint.trim() != "/api/files/programs/custom" {
        let legacy_url = normalize_url(&ip, &endpoint);
        let legacy_raw = client
            .post(&legacy_url)
            .header("Content-Type", "application/json")
            .body(payload_text)
            .send()
            .await;

        match legacy_raw {
            Ok(resp) => {
                let status = resp.status();
                let body = response_text(resp).await;
                let snippet = body.chars().take(180).collect::<String>();
                if status.is_success() && !looks_like_html(&body) {
                    let msg = format!("Uploaded {} via compatibility endpoint {}", filename, legacy_url);
                    debug_lines.push(format!("success={}", msg));
                    append_upload_debug(&debug_lines);
                    return Ok(UploadResult { message: msg, ago_filename: custom_filename.clone() });
                }
                attempts.push(format!(
                    "POST {} raw-json -> HTTP {} ({})",
                    legacy_url, status, snippet
                ));
            }
            Err(e) => {
                attempts.push(format!("POST {} raw-json -> {}", legacy_url, e));
            }
        }
    }

    let err = format!("Upload failed. Tried: {}", attempts.join("; "));
    debug_lines.push(format!("error={}", err));
    append_upload_debug(&debug_lines);
    Err(err)
}

#[tauri::command]
pub async fn delete_ago_program(ip: String, filename: String) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(8))
        .build()
        .map_err(|e| format!("HTTP client error: {}", e))?;

    let url = format!("http://{}/api/files/programs/custom/{}", ip, filename);

    let resp = client
        .delete(&url)
        .header("Accept", "application/json")
        .header("Origin", format!("http://{}", ip))
        .send()
        .await
        .map_err(|e| format!("Failed to reach AGO: {}", e))?;

    if resp.status().is_success() {
        return Ok(format!("Deleted {}", filename));
    }

    Err(format!(
        "AGO returned HTTP {} when deleting {}",
        resp.status(),
        filename
    ))
}

#[tauri::command]
pub async fn get_upload_debug_log() -> Result<String, String> {
    match fs::read_to_string(UPLOAD_DEBUG_LOG_PATH) {
        Ok(content) => Ok(content),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(String::new()),
        Err(e) => Err(format!("Failed to read upload debug log: {}", e)),
    }
}

#[tauri::command]
pub async fn clear_upload_debug_log() -> Result<(), String> {
    fs::write(UPLOAD_DEBUG_LOG_PATH, "").map_err(|e| format!("Failed to clear upload debug log: {}", e))
}

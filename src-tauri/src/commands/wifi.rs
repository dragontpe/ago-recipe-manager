use std::process::Command;
use std::time::Duration;

#[tauri::command]
pub async fn wifi_get_interface() -> Result<String, String> {
    let output = Command::new("networksetup")
        .arg("-listallhardwareports")
        .output()
        .map_err(|e| format!("Failed to run networksetup: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);

    // Find the Wi-Fi interface (look for "Wi-Fi" or "AirPort" hardware port)
    let mut found_wifi = false;
    for line in stdout.lines() {
        if line.contains("Wi-Fi") || line.contains("AirPort") {
            found_wifi = true;
            continue;
        }
        if found_wifi && line.starts_with("Device:") {
            let device = line.trim_start_matches("Device:").trim().to_string();
            return Ok(device);
        }
        if found_wifi && line.starts_with("Hardware Port:") {
            // We've passed the device line without finding it
            found_wifi = false;
        }
    }

    Err("Could not find Wi-Fi interface".to_string())
}

#[tauri::command]
pub async fn wifi_get_current_network(interface: String) -> Result<String, String> {
    let output = Command::new("networksetup")
        .args(["-getairportnetwork", &interface])
        .output()
        .map_err(|e| format!("Failed to get current network: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    let line = stdout.trim();
    let lower = line.to_lowercase();

    // Common non-connected outputs
    if lower.contains("not associated")
        || lower.contains("not a wi-fi interface")
        || lower.contains("error obtaining wireless information")
    {
        return Ok(String::new());
    }

    // Typical format: "Current Wi-Fi Network: <SSID>"
    if let Some((_, ssid)) = line.split_once(':') {
        return Ok(ssid.trim().trim_matches('"').to_string());
    }

    if output.status.success() {
        Ok(String::new())
    } else {
        Err(format!(
            "Failed to read current network: {} {}",
            stdout.trim(),
            stderr.trim()
        ))
    }
}

#[tauri::command]
pub async fn wifi_connect(interface: String, ssid: String, password: String) -> Result<(), String> {
    let mut args = vec!["-setairportnetwork".to_string(), interface.clone(), ssid.clone()];
    if !password.is_empty() {
        args.push(password.clone());
    }

    let first = Command::new("networksetup")
        .args(args.iter().map(String::as_str))
        .output()
        .map_err(|e| format!("Failed to connect to WiFi: {}", e))?;

    let first_stdout = String::from_utf8_lossy(&first.stdout).to_string();
    let first_stderr = String::from_utf8_lossy(&first.stderr).to_string();
    let first_combined = format!("{} {}", first_stdout, first_stderr).to_lowercase();

    if first.status.success()
        || first_combined.contains("already associated")
        || first_combined.contains("already connected")
    {
        return Ok(());
    }

    // Retry without password for networks already stored in Keychain.
    if !password.is_empty() {
        let second = Command::new("networksetup")
            .args(["-setairportnetwork", &interface, &ssid])
            .output()
            .map_err(|e| format!("Failed to connect to WiFi: {}", e))?;

        let second_stdout = String::from_utf8_lossy(&second.stdout).to_string();
        let second_stderr = String::from_utf8_lossy(&second.stderr).to_string();
        let second_combined = format!("{} {}", second_stdout, second_stderr).to_lowercase();

        if second.status.success()
            || second_combined.contains("already associated")
            || second_combined.contains("already connected")
        {
            return Ok(());
        }
    }

    Err(format!(
        "Failed to connect: {} {}",
        first_stdout.trim(),
        first_stderr.trim()
    ))
}

#[tauri::command]
pub async fn wifi_reconnect(interface: String, ssid: String, password: String) -> Result<(), String> {
    // Reconnect to a previous network. If password is empty, try without it (saved networks).
    if password.is_empty() {
        let output = Command::new("networksetup")
            .args(["-setairportnetwork", &interface, &ssid])
            .output()
            .map_err(|e| format!("Failed to reconnect: {}", e))?;

        if output.status.success() {
            Ok(())
        } else {
            Err(format!("Failed to reconnect to {}", ssid))
        }
    } else {
        wifi_connect(interface, ssid, password).await
    }
}

#[tauri::command]
pub async fn wifi_probe_ago(ip: String) -> Result<bool, String> {
    let url = format!("http://{}", ip);
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(2))
        .build()
        .map_err(|e| format!("Failed to create probe client: {}", e))?;

    match client.get(url).send().await {
        Ok(resp) => Ok(resp.status().is_success()),
        Err(_) => Ok(false),
    }
}

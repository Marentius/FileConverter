use serde::{Deserialize, Serialize};
use std::process::Command;
use std::path::Path;

#[derive(Debug, Serialize, Deserialize)]
pub struct ConversionJob {
    pub id: String,
    pub input_path: String,
    pub output_path: String,
    pub format: String,
    pub status: String,
    pub progress: f32,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConversionResult {
    pub success: bool,
    pub message: String,
    pub jobs: Vec<ConversionJob>,
}

#[tauri::command]
async fn convert_files(input_paths: Vec<String>, output_dir: String, format: String) -> Result<ConversionResult, String> {
    // Call the CLI directly with the actual file paths
    // Try to find converter in common locations
    let converter_paths = vec![
        "converter",
        "C:\\Users\\vetle\\AppData\\Roaming\\npm\\converter.cmd",
        "C:\\Users\\vetle\\AppData\\Roaming\\npm\\converter",
        "C:\\Program Files\\nodejs\\converter.cmd",
        "C:\\Program Files\\nodejs\\converter"
    ];
    
    let mut result = None;
    for path in converter_paths {
        match Command::new(path)
            .args(&["convert", "--in", &input_paths.join(","), "--out", &output_dir, "--to", &format])
            .output() {
            Ok(output) => {
                result = Some(output);
                break;
            }
            Err(_) => continue,
        }
    }
    
    let output = result.ok_or("Failed to find converter executable")?;
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    
    // Sjekk om output inneholder feilmeldinger
    let has_errors = stdout.contains("⚠️") || stdout.contains("feilet") || stdout.contains("failed") || 
                    stderr.contains("error") || stderr.contains("Error");
    
    if output.status.success() && !has_errors {
        Ok(ConversionResult {
            success: true,
            message: format!("✅ SUCCESS: Converted {} files to {} format.\n\n📁 Output saved to: {}/\n\nCLI Output: {}", 
                input_paths.len(), format.to_uppercase(), output_dir, stdout),
            jobs: input_paths.iter().enumerate().map(|(index, path)| {
                let filename = std::path::Path::new(path).file_stem().unwrap_or_default();
                ConversionJob {
                    id: format!("job-{}", index),
                    input_path: path.clone(),
                    output_path: format!("{}/{}.{}", output_dir, filename.to_string_lossy(), format),
                    format: format.clone(),
                    status: "completed".to_string(),
                    progress: 100.0,
                    error: None,
                }
            }).collect(),
        })
    } else {
        Ok(ConversionResult {
            success: false,
            message: format!("❌ Conversion failed:\n\nCLI Output: {}\n\nError Output: {}", stdout, stderr),
            jobs: vec![],
        })
    }
}

#[tauri::command]
async fn check_dependencies() -> Result<serde_json::Value, String> {
    let mut results = serde_json::Map::new();
    
    // Try to find converter in common locations
    let converter_paths = vec![
        "converter",
        "C:\\Users\\vetle\\AppData\\Roaming\\npm\\converter.cmd",
        "C:\\Users\\vetle\\AppData\\Roaming\\npm\\converter",
        "C:\\Program Files\\nodejs\\converter.cmd",
        "C:\\Program Files\\nodejs\\converter"
    ];
    
    // Check Pandoc using CLI
    let mut pandoc_ok = false;
    for path in &converter_paths {
        match Command::new(path).args(&["check-pandoc"]).output() {
            Ok(output) => {
                if output.status.success() {
                    pandoc_ok = true;
                    break;
                }
            }
            Err(_) => continue,
        }
    }
    results.insert("pandoc".to_string(), serde_json::Value::Bool(pandoc_ok));
    
    // Check LibreOffice
    let libreoffice_result = Command::new("libreoffice").arg("--version").output();
    results.insert("libreoffice".to_string(), serde_json::Value::Bool(libreoffice_result.is_ok()));
    
    // Check Ghostscript using CLI
    let mut gs_ok = false;
    for path in &converter_paths {
        match Command::new(path).args(&["check-pdf-tools"]).output() {
            Ok(output) => {
                if output.status.success() {
                    let output_str = String::from_utf8_lossy(&output.stdout);
                    if output_str.contains("✅ Ghostscript funnet") {
                        gs_ok = true;
                        break;
                    }
                }
            }
            Err(_) => continue,
        }
    }
    results.insert("ghostscript".to_string(), serde_json::Value::Bool(gs_ok));
    
    // Check qpdf using CLI
    let mut qpdf_ok = false;
    for path in &converter_paths {
        match Command::new(path).args(&["check-pdf-tools"]).output() {
            Ok(output) => {
                if output.status.success() {
                    let output_str = String::from_utf8_lossy(&output.stdout);
                    if output_str.contains("✅ qpdf funnet") {
                        qpdf_ok = true;
                        break;
                    }
                }
            }
            Err(_) => continue,
        }
    }
    results.insert("qpdf".to_string(), serde_json::Value::Bool(qpdf_ok));
    
    Ok(serde_json::Value::Object(results))
}

#[tauri::command]
async fn open_folder(path: String) -> Result<(), String> {
    // Use the system's default file explorer to open the folder
    #[cfg(target_os = "windows")]
    {
        let _ = Command::new("explorer").arg(&path).spawn();
    }
    
    #[cfg(target_os = "macos")]
    {
        let _ = Command::new("open").arg(&path).spawn();
    }
    
    #[cfg(target_os = "linux")]
    {
        let _ = Command::new("xdg-open").arg(&path).spawn();
    }
    
    Ok(())
}

#[tauri::command]
async fn select_files() -> Result<Vec<String>, String> {
    // For now, return an empty vector - the frontend will handle file selection
    // In a real implementation, this would open a native file dialog
    Ok(vec![])
}

#[tauri::command]
async fn get_supported_formats() -> Result<serde_json::Value, String> {
    // Try to find converter in common locations
    let converter_paths = vec![
        "converter",
        "C:\\Users\\vetle\\AppData\\Roaming\\npm\\converter.cmd",
        "C:\\Users\\vetle\\AppData\\Roaming\\npm\\converter",
        "C:\\Program Files\\nodejs\\converter.cmd",
        "C:\\Program Files\\nodejs\\converter"
    ];
    
    let mut result = None;
    for path in converter_paths {
        match Command::new(path).args(&["formats"]).output() {
            Ok(output) => {
                result = Some(output);
                break;
            }
            Err(_) => continue,
        }
    }
    
    let output = result.ok_or("Failed to find converter executable")?;
    
    if output.status.success() {
        // Parse the output to extract formats
        let output_str = String::from_utf8_lossy(&output.stdout);
        let mut formats = serde_json::Map::new();
        
        // Simple parsing - in real implementation, we'd parse this more carefully
        if output_str.contains("png") { formats.insert("png".to_string(), serde_json::Value::Bool(true)); }
        if output_str.contains("jpg") { formats.insert("jpg".to_string(), serde_json::Value::Bool(true)); }
        if output_str.contains("pdf") { formats.insert("pdf".to_string(), serde_json::Value::Bool(true)); }
        if output_str.contains("docx") { formats.insert("docx".to_string(), serde_json::Value::Bool(true)); }
        if output_str.contains("heic") { formats.insert("heic".to_string(), serde_json::Value::Bool(true)); }
        
        Ok(serde_json::Value::Object(formats))
    } else {
        Err("Failed to get supported formats".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())

        .invoke_handler(tauri::generate_handler![
            convert_files,
            check_dependencies,
            open_folder,
            get_supported_formats,
            select_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

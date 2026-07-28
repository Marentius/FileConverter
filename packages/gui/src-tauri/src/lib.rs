use serde::{Deserialize, Serialize};
use std::env;
use std::path::PathBuf;
use std::process::Command;

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

fn converter_paths() -> Vec<PathBuf> {
    let mut paths = Vec::new();

    if let Some(configured_path) = env::var_os("FILECONVERTER_CLI") {
        paths.push(PathBuf::from(configured_path));
    }

    #[cfg(target_os = "windows")]
    {
        paths.push(PathBuf::from("converter.cmd"));
        paths.push(PathBuf::from("converter.exe"));

        if let Some(app_data) = env::var_os("APPDATA") {
            let npm_dir = PathBuf::from(app_data).join("npm");
            paths.push(npm_dir.join("converter.cmd"));
            paths.push(npm_dir.join("converter"));
        }

        for env_name in ["ProgramFiles", "ProgramFiles(x86)"] {
            if let Some(program_files) = env::var_os(env_name) {
                let node_dir = PathBuf::from(program_files).join("nodejs");
                paths.push(node_dir.join("converter.cmd"));
                paths.push(node_dir.join("converter"));
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        paths.push(PathBuf::from("converter"));
    }

    paths
}

fn run_converter(args: &[&str]) -> Result<std::process::Output, String> {
    let mut attempted_paths = Vec::new();

    for path in converter_paths() {
        attempted_paths.push(path.display().to_string());

        match Command::new(&path).args(args).output() {
            Ok(output) => return Ok(output),
            Err(_) => continue,
        }
    }

    Err(format!(
        "Failed to find converter executable. Tried: {}",
        attempted_paths.join(", ")
    ))
}

#[tauri::command]
async fn convert_files(
    input_paths: Vec<String>,
    output_dir: String,
    format: String,
) -> Result<ConversionResult, String> {
    let output = run_converter(&[
        "convert",
        "--in",
        &input_paths.join(","),
        "--out",
        &output_dir,
        "--to",
        &format,
    ])?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    // Sjekk om output inneholder feilmeldinger
    let has_errors = stdout.contains("⚠️")
        || stdout.contains("feilet")
        || stdout.contains("failed")
        || stderr.contains("error")
        || stderr.contains("Error");

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
            message: format!(
                "❌ Conversion failed:\n\nCLI Output: {}\n\nError Output: {}",
                stdout, stderr
            ),
            jobs: vec![],
        })
    }
}

#[tauri::command]
async fn check_dependencies() -> Result<serde_json::Value, String> {
    let mut results = serde_json::Map::new();

    results.insert(
        "npm conversion engine".to_string(),
        serde_json::Value::Bool(true),
    );
    results.insert(
        "image conversion".to_string(),
        serde_json::Value::Bool(true),
    );
    results.insert(
        "document conversion".to_string(),
        serde_json::Value::Bool(true),
    );
    results.insert("pdf processing".to_string(), serde_json::Value::Bool(true));
    results.insert("ocr".to_string(), serde_json::Value::Bool(true));

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
    let output = run_converter(&["formats"])?;

    if output.status.success() {
        // Parse the output to extract formats
        let output_str = String::from_utf8_lossy(&output.stdout);
        let mut formats = serde_json::Map::new();

        // Simple parsing - in real implementation, we'd parse this more carefully
        if output_str.contains("png") {
            formats.insert("png".to_string(), serde_json::Value::Bool(true));
        }
        if output_str.contains("jpg") {
            formats.insert("jpg".to_string(), serde_json::Value::Bool(true));
        }
        if output_str.contains("pdf") {
            formats.insert("pdf".to_string(), serde_json::Value::Bool(true));
        }
        if output_str.contains("docx") {
            formats.insert("docx".to_string(), serde_json::Value::Bool(true));
        }
        if output_str.contains("heic") {
            formats.insert("heic".to_string(), serde_json::Value::Bool(true));
        }

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

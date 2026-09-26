use serde::{Deserialize, Serialize};
use std::env;
use std::path::{Path, PathBuf};
use std::process::{Command, Output};

#[derive(Debug, Serialize)]
pub struct ConversionJob {
    input_path: String,
    output_path: String,
    status: String,
    error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ConversionResult {
    success: bool,
    message: String,
    jobs: Vec<ConversionJob>,
}

#[derive(Deserialize)]
struct CoreResult {
    jobs: Vec<CoreJob>,
}

#[derive(Deserialize)]
struct CoreJob {
    plan: CorePlan,
    status: String,
    error: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CorePlan {
    output_path: String,
}

fn run_converter(args: &[&str]) -> Result<Output, String> {
    if let Some(configured_path) = env::var_os("FILECONVERTER_CLI") {
        return Command::new(configured_path)
            .args(args)
            .output()
            .map_err(|error| format!("Could not start FILECONVERTER_CLI: {error}"));
    }

    // Use the workspace build during development.
    let local_cli = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../core/dist/cli.js");
    if local_cli.is_file() {
        return Command::new("node")
            .arg(local_cli)
            .args(args)
            .output()
            .map_err(|error| format!("Could not start Node.js: {error}"));
    }

    Command::new("converter")
        .args(args)
        .output()
        .map_err(|error| format!("FileConverter CLI was not found ({error}). Run npm run core:build or install @fileconverter/core globally."))
}

fn convert_one(input_path: &str, output_dir: &str, format: &str) -> ConversionJob {
    let failure = |error: String| ConversionJob {
        input_path: input_path.to_owned(),
        output_path: String::new(),
        status: "failed".to_owned(),
        error: Some(error),
    };

    let Some(stem) = Path::new(input_path).file_stem() else {
        return failure("Invalid file name.".to_owned());
    };
    let expected_output =
        Path::new(output_dir).join(format!("{}.{}", stem.to_string_lossy(), format));
    if expected_output.exists() {
        return failure(format!(
            "Output file already exists: {}",
            expected_output.display()
        ));
    }

    let output = run_converter(&[
        "convert", "--in", input_path, "--out", output_dir, "--to", format, "--json",
    ]);

    let output = match output {
        Ok(output) => output,
        Err(error) => return failure(error),
    };
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_owned();
        return failure(if stderr.is_empty() {
            "Conversion was interrupted.".to_owned()
        } else {
            stderr
        });
    }

    let result: CoreResult = match serde_json::from_slice(&output.stdout) {
        Ok(result) => result,
        Err(error) => return failure(format!("Invalid response from CLI: {error}")),
    };
    let Some(job) = result.jobs.into_iter().next() else {
        return failure(
            "No conversion was performed. This format pair may be unsupported.".to_owned(),
        );
    };
    if job.status != "success" {
        return failure(job.error.unwrap_or_else(|| "Conversion failed.".to_owned()));
    }
    if !Path::new(&job.plan.output_path).is_file() {
        return failure("The CLI reported success, but the output file was not found.".to_owned());
    }
    ConversionJob {
        input_path: input_path.to_owned(),
        output_path: job.plan.output_path,
        status: "completed".to_owned(),
        error: None,
    }
}

#[tauri::command]
async fn convert_files(
    input_paths: Vec<String>,
    output_dir: String,
    format: String,
) -> Result<ConversionResult, String> {
    if input_paths.is_empty() || output_dir.is_empty() || format.is_empty() {
        return Err("Select files, an output folder, and a format.".to_owned());
    }
    tauri::async_runtime::spawn_blocking(move || {
        let jobs: Vec<_> = input_paths
            .iter()
            .map(|path| convert_one(path, &output_dir, &format))
            .collect();
        let succeeded = jobs.iter().filter(|job| job.status == "completed").count();
        let success = succeeded == jobs.len();
        let message = format!("{succeeded} of {} files converted.", jobs.len());
        ConversionResult {
            success,
            message,
            jobs,
        }
    })
    .await
    .map_err(|error| error.to_string())
}

#[tauri::command]
fn open_folder(path: String) -> Result<(), String> {
    if !Path::new(&path).is_dir() {
        return Err("The output folder does not exist.".to_owned());
    }
    #[cfg(target_os = "windows")]
    let program = "explorer";
    #[cfg(target_os = "macos")]
    let program = "open";
    #[cfg(target_os = "linux")]
    let program = "xdg-open";
    Command::new(program)
        .arg(path)
        .spawn()
        .map(|_| ())
        .map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![convert_files, open_folder])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

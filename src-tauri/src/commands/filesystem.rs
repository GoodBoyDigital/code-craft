use serde::Serialize;
use std::fs;
use std::path::Path;

#[derive(Debug, Serialize)]
pub struct FileEntry {
    pub path: String,
    pub name: String,
    #[serde(rename = "type")]
    pub entry_type: String,
}

/// Validates that a path is safe for file operations.
/// Returns the canonicalized path if valid, or an error message if not.
///
/// Security checks:
/// 1. Path must be absolute
/// 2. Path must not contain path traversal sequences after canonicalization
/// 3. Path must be within the user's home directory or /tmp
fn validate_path(path: &str) -> Result<std::path::PathBuf, String> {
    let path_obj = Path::new(path);

    // Reject relative paths
    if !path_obj.is_absolute() {
        return Err("Path must be absolute".to_string());
    }

    // For paths that don't exist yet (write operations), we need to check the parent
    let check_path = if path_obj.exists() {
        path_obj.to_path_buf()
    } else {
        // Find the first existing ancestor
        let mut ancestor = path_obj.to_path_buf();
        while !ancestor.exists() {
            if let Some(parent) = ancestor.parent() {
                ancestor = parent.to_path_buf();
            } else {
                return Err("No valid ancestor path exists".to_string());
            }
        }
        ancestor
    };

    // Canonicalize to resolve symlinks and eliminate .. components
    let canonical = check_path
        .canonicalize()
        .map_err(|e| format!("Failed to canonicalize path: {}", e))?;

    // Build the full canonical path for non-existent files
    let final_path = if path_obj.exists() {
        canonical
    } else {
        // Append the remaining path components to the canonical ancestor
        let remaining = path_obj
            .strip_prefix(&check_path)
            .unwrap_or(Path::new(""));
        canonical.join(remaining)
    };

    // Get allowed base directories
    let home_dir = dirs::home_dir().ok_or("Could not determine home directory")?;
    let tmp_dir = std::env::temp_dir();

    // Check if path is within allowed directories
    let canonical_str = final_path.to_string_lossy();
    let home_str = home_dir.to_string_lossy();
    let tmp_str = tmp_dir.to_string_lossy();

    if !canonical_str.starts_with(home_str.as_ref())
        && !canonical_str.starts_with(tmp_str.as_ref())
    {
        return Err(format!(
            "Path must be within home directory ({}) or temp directory ({})",
            home_str, tmp_str
        ));
    }

    // Additional check: reject paths that try to access sensitive locations
    let sensitive_paths = [
        ".ssh",
        ".gnupg",
        ".aws",
        ".config/gcloud",
        ".kube",
        ".docker",
    ];

    for sensitive in sensitive_paths {
        let sensitive_path = home_dir.join(sensitive);
        if final_path.starts_with(&sensitive_path) {
            return Err(format!(
                "Access to sensitive directory is not allowed: {}",
                sensitive
            ));
        }
    }

    Ok(final_path)
}

#[tauri::command]
pub async fn read_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let validated_path = validate_path(&path)?;

    if !validated_path.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }

    let entries =
        fs::read_dir(&validated_path).map_err(|e| format!("Failed to read directory: {}", e))?;

    let mut result = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let entry_path = entry.path();
        let name = entry
            .file_name()
            .to_str()
            .unwrap_or("unknown")
            .to_string();

        let entry_type = if entry_path.is_dir() {
            "directory"
        } else {
            "file"
        };

        result.push(FileEntry {
            path: entry_path.to_string_lossy().to_string(),
            name,
            entry_type: entry_type.to_string(),
        });
    }

    Ok(result)
}

#[tauri::command]
pub async fn read_file(path: String) -> Result<String, String> {
    let validated_path = validate_path(&path)?;

    if !validated_path.is_file() {
        return Err(format!("Path is not a file: {}", path));
    }

    fs::read_to_string(&validated_path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), String> {
    let validated_path = validate_path(&path)?;

    // Create parent directories if they don't exist
    if let Some(parent) = validated_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directories: {}", e))?;
        }
    }

    fs::write(&validated_path, content).map_err(|e| format!("Failed to write file: {}", e))
}

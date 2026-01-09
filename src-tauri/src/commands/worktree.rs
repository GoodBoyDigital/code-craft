use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;

#[derive(Debug, Serialize, Deserialize)]
pub struct Worktree {
    pub path: String,
    pub head: String,
    pub branch: Option<String>,
    pub is_bare: bool,
    pub is_detached: bool,
    pub is_main: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MergeResult {
    pub success: bool,
    pub message: String,
    pub conflicts: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BranchInfo {
    pub name: String,
    pub upstream: Option<String>,
    pub ahead: i32,
    pub behind: i32,
}

/// Parse `git worktree list --porcelain` output
fn parse_worktree_list(output: &str) -> Vec<Worktree> {
    let mut worktrees = Vec::new();
    let mut current_path = String::new();
    let mut current_head = String::new();
    let mut current_branch: Option<String> = None;
    let mut is_bare = false;
    let mut is_detached = false;
    let mut is_first = true;

    for line in output.lines() {
        if line.is_empty() {
            if !current_path.is_empty() {
                worktrees.push(Worktree {
                    path: current_path.clone(),
                    head: current_head.clone(),
                    branch: current_branch.clone(),
                    is_bare,
                    is_detached,
                    is_main: is_first,
                });
                is_first = false;
            }
            current_path.clear();
            current_head.clear();
            current_branch = None;
            is_bare = false;
            is_detached = false;
            continue;
        }

        if let Some(path) = line.strip_prefix("worktree ") {
            current_path = path.to_string();
        } else if let Some(head) = line.strip_prefix("HEAD ") {
            current_head = head.to_string();
        } else if let Some(branch) = line.strip_prefix("branch ") {
            current_branch = Some(branch.replace("refs/heads/", ""));
        } else if line == "bare" {
            is_bare = true;
        } else if line == "detached" {
            is_detached = true;
        }
    }

    // Handle last worktree if output doesn't end with empty line
    if !current_path.is_empty() {
        worktrees.push(Worktree {
            path: current_path,
            head: current_head,
            branch: current_branch,
            is_bare,
            is_detached,
            is_main: is_first,
        });
    }

    worktrees
}

/// List all worktrees with parsed metadata
#[tauri::command]
pub async fn list_worktrees(repo_path: String) -> Result<Vec<Worktree>, String> {
    let output = Command::new("git")
        .args(["worktree", "list", "--porcelain"])
        .current_dir(&repo_path)
        .output()
        .map_err(|e| format!("Failed to execute git command: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(parse_worktree_list(&stdout))
}

/// Get the main repository path (handles both main repo and worktree)
#[tauri::command]
pub async fn get_main_repo_path(current_path: String) -> Result<String, String> {
    let output = Command::new("git")
        .args(["rev-parse", "--git-common-dir"])
        .current_dir(&current_path)
        .output()
        .map_err(|e| format!("Failed to execute git command: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let git_common = String::from_utf8_lossy(&output.stdout).trim().to_string();

    // Get the absolute path
    let git_path = if Path::new(&git_common).is_absolute() {
        git_common
    } else {
        Path::new(&current_path)
            .join(&git_common)
            .canonicalize()
            .map_err(|e| format!("Failed to resolve path: {}", e))?
            .to_string_lossy()
            .to_string()
    };

    // Return the parent directory of .git
    if git_path.ends_with(".git") {
        Ok(Path::new(&git_path)
            .parent()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or(git_path))
    } else {
        Ok(git_path)
    }
}

/// Create a new worktree with a new branch
#[tauri::command]
pub async fn create_worktree(
    repo_path: String,
    worktree_path: String,
    branch_name: String,
    base_branch: String,
) -> Result<Worktree, String> {
    // Verify repo_path exists and is a git repository
    if !Path::new(&repo_path).exists() {
        return Err(format!("Repository path does not exist: {}", repo_path));
    }

    // Check if it's a git repository
    let git_check = Command::new("git")
        .args(["rev-parse", "--git-dir"])
        .current_dir(&repo_path)
        .output()
        .map_err(|e| format!("Failed to check git repo: {}", e))?;

    if !git_check.status.success() {
        return Err(format!("Not a git repository: {}", repo_path));
    }

    // Create parent directory for worktree if it doesn't exist
    if let Some(parent) = Path::new(&worktree_path).parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directory {}: {}", parent.display(), e))?;
        }
    }

    // Resolve the base reference to a commit hash to ensure it's valid
    let resolve_output = Command::new("git")
        .args(["rev-parse", "--verify", &base_branch])
        .current_dir(&repo_path)
        .output()
        .map_err(|e| format!("Failed to resolve reference: {}", e))?;

    let resolved_ref = if resolve_output.status.success() {
        String::from_utf8_lossy(&resolve_output.stdout).trim().to_string()
    } else {
        // Fall back to HEAD if the reference is invalid
        let head_output = Command::new("git")
            .args(["rev-parse", "HEAD"])
            .current_dir(&repo_path)
            .output()
            .map_err(|e| format!("Failed to get HEAD: {}", e))?;

        if !head_output.status.success() {
            let stderr = String::from_utf8_lossy(&head_output.stderr);
            return Err(format!(
                "Failed to resolve '{}' and HEAD in {}: {}",
                base_branch, repo_path, stderr
            ));
        }
        String::from_utf8_lossy(&head_output.stdout).trim().to_string()
    };

    let output = Command::new("git")
        .args([
            "worktree",
            "add",
            "-b",
            &branch_name,
            &worktree_path,
            &resolved_ref,
        ])
        .current_dir(&repo_path)
        .output()
        .map_err(|e| format!("Failed to execute git command: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    // Get the HEAD of the new worktree
    let head_output = Command::new("git")
        .args(["rev-parse", "HEAD"])
        .current_dir(&worktree_path)
        .output()
        .map_err(|e| format!("Failed to get HEAD: {}", e))?;

    let head = String::from_utf8_lossy(&head_output.stdout)
        .trim()
        .to_string();

    Ok(Worktree {
        path: worktree_path,
        head,
        branch: Some(branch_name),
        is_bare: false,
        is_detached: false,
        is_main: false,
    })
}

/// Remove a worktree (with optional force)
#[tauri::command]
pub async fn remove_worktree(
    repo_path: String,
    worktree_path: String,
    force: bool,
) -> Result<(), String> {
    let mut args = vec!["worktree", "remove"];
    if force {
        args.push("--force");
    }
    args.push(&worktree_path);

    let output = Command::new("git")
        .args(&args)
        .current_dir(&repo_path)
        .output()
        .map_err(|e| format!("Failed to execute git command: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    Ok(())
}

/// Merge a branch into another
#[tauri::command]
pub async fn merge_branch(
    repo_path: String,
    source_branch: String,
    target_branch: String,
) -> Result<MergeResult, String> {
    // First, checkout the target branch
    let checkout_output = Command::new("git")
        .args(["checkout", &target_branch])
        .current_dir(&repo_path)
        .output()
        .map_err(|e| format!("Failed to checkout: {}", e))?;

    if !checkout_output.status.success() {
        return Ok(MergeResult {
            success: false,
            message: String::from_utf8_lossy(&checkout_output.stderr).to_string(),
            conflicts: vec![],
        });
    }

    // Then merge the source branch
    let merge_output = Command::new("git")
        .args(["merge", &source_branch, "--no-edit"])
        .current_dir(&repo_path)
        .output()
        .map_err(|e| format!("Failed to merge: {}", e))?;

    if merge_output.status.success() {
        return Ok(MergeResult {
            success: true,
            message: "Merge successful".to_string(),
            conflicts: vec![],
        });
    }

    // Check for conflicts
    let status_output = Command::new("git")
        .args(["status", "--porcelain"])
        .current_dir(&repo_path)
        .output()
        .map_err(|e| format!("Failed to get status: {}", e))?;

    let status = String::from_utf8_lossy(&status_output.stdout);
    let conflicts: Vec<String> = status
        .lines()
        .filter(|line| line.starts_with("UU") || line.starts_with("AA") || line.starts_with("DD"))
        .map(|line| line[3..].to_string())
        .collect();

    Ok(MergeResult {
        success: false,
        message: String::from_utf8_lossy(&merge_output.stderr).to_string(),
        conflicts,
    })
}

/// Check for uncommitted changes in a worktree
#[tauri::command]
pub async fn has_uncommitted_changes(worktree_path: String) -> Result<bool, String> {
    let output = Command::new("git")
        .args(["status", "--porcelain"])
        .current_dir(&worktree_path)
        .output()
        .map_err(|e| format!("Failed to execute git command: {}", e))?;

    Ok(!output.stdout.is_empty())
}

/// Get branch info including upstream/parent relationship
#[tauri::command]
pub async fn get_branch_info(repo_path: String, branch_name: String) -> Result<BranchInfo, String> {
    // Get upstream branch
    let upstream_output = Command::new("git")
        .args([
            "config",
            "--get",
            &format!("branch.{}.remote", branch_name),
        ])
        .current_dir(&repo_path)
        .output()
        .ok();

    let upstream = upstream_output
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string());

    // Get ahead/behind counts
    let rev_list_output = Command::new("git")
        .args([
            "rev-list",
            "--left-right",
            "--count",
            &format!("{}...origin/{}", branch_name, branch_name),
        ])
        .current_dir(&repo_path)
        .output()
        .ok();

    let (ahead, behind) = rev_list_output
        .filter(|o| o.status.success())
        .and_then(|o| {
            let output = String::from_utf8_lossy(&o.stdout);
            let parts: Vec<&str> = output.trim().split('\t').collect();
            if parts.len() == 2 {
                Some((
                    parts[0].parse().unwrap_or(0),
                    parts[1].parse().unwrap_or(0),
                ))
            } else {
                None
            }
        })
        .unwrap_or((0, 0));

    Ok(BranchInfo {
        name: branch_name,
        upstream,
        ahead,
        behind,
    })
}

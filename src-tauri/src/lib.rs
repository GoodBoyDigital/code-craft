mod commands;

use commands::filesystem::*;
use commands::pty::*;
use commands::worktree::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            // Worktree commands
            list_worktrees,
            get_main_repo_path,
            create_worktree,
            remove_worktree,
            merge_branch,
            has_uncommitted_changes,
            get_branch_info,
            // Filesystem commands
            read_directory,
            read_file,
            write_file,
            // PTY commands
            create_pty_session,
            write_to_pty,
            resize_pty,
            close_pty_session,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

// Worktree types
export interface Worktree {
  path: string;
  head: string;
  branch: string | null;
  is_bare: boolean;
  is_detached: boolean;
  is_main: boolean;
}

export interface MergeResult {
  success: boolean;
  message: string;
  conflicts: string[];
}

export interface BranchInfo {
  name: string;
  upstream: string | null;
  ahead: number;
  behind: number;
}

// Worktree commands
export async function listWorktrees(repoPath: string): Promise<Worktree[]> {
  return invoke<Worktree[]>("list_worktrees", { repoPath });
}

export async function getMainRepoPath(currentPath: string): Promise<string> {
  return invoke<string>("get_main_repo_path", { currentPath });
}

export async function createWorktree(
  repoPath: string,
  worktreePath: string,
  branchName: string,
  baseBranch: string
): Promise<Worktree> {
  return invoke<Worktree>("create_worktree", {
    repoPath,
    worktreePath,
    branchName,
    baseBranch,
  });
}

export async function removeWorktree(
  repoPath: string,
  worktreePath: string,
  force = false
): Promise<void> {
  return invoke<void>("remove_worktree", { repoPath, worktreePath, force });
}

export async function mergeBranch(
  repoPath: string,
  sourceBranch: string,
  targetBranch: string
): Promise<MergeResult> {
  return invoke<MergeResult>("merge_branch", {
    repoPath,
    sourceBranch,
    targetBranch,
  });
}

export async function hasUncommittedChanges(
  worktreePath: string
): Promise<boolean> {
  return invoke<boolean>("has_uncommitted_changes", { worktreePath });
}

export async function getBranchInfo(
  repoPath: string,
  branchName: string
): Promise<BranchInfo> {
  return invoke<BranchInfo>("get_branch_info", { repoPath, branchName });
}

// Filesystem types
export interface FileEntry {
  path: string;
  name: string;
  type: "file" | "directory";
}

// Filesystem commands
export async function readDirectory(path: string): Promise<FileEntry[]> {
  return invoke<FileEntry[]>("read_directory", { path });
}

export async function readFile(path: string): Promise<string> {
  return invoke<string>("read_file", { path });
}

export async function writeFile(path: string, content: string): Promise<void> {
  return invoke<void>("write_file", { path, content });
}

// PTY commands
export async function createPtySession(
  sessionId: string,
  cwd: string,
  command?: string
): Promise<string> {
  return invoke<string>("create_pty_session", { sessionId, cwd, command });
}

export async function writeToPty(
  sessionId: string,
  data: string
): Promise<void> {
  return invoke<void>("write_to_pty", { sessionId, data });
}

export async function resizePty(
  sessionId: string,
  cols: number,
  rows: number
): Promise<void> {
  return invoke<void>("resize_pty", { sessionId, cols, rows });
}

export async function closePtySession(sessionId: string): Promise<void> {
  return invoke<void>("close_pty_session", { sessionId });
}

// PTY event listener
export async function onPtyOutput(
  sessionId: string,
  callback: (data: string) => void
): Promise<UnlistenFn> {
  return listen<string>(`pty-output-${sessionId}`, (event) => {
    callback(event.payload);
  });
}

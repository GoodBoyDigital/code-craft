import { invoke } from "@tauri-apps/api/core";

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

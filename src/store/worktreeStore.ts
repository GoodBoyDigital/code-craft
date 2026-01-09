import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  listWorktrees,
  createWorktree,
  removeWorktree,
  type Worktree,
} from "@/lib/tauri";
import { generateId } from "@/lib/utils";

// Check if running in Tauri
const isTauri = typeof window !== "undefined" && "__TAURI__" in window;

// Storage key for parent relationships
const PARENT_RELATIONSHIPS_KEY = "muscat-parent-relationships";

// Store branch -> parent branch relationships
interface ParentRelationships {
  [branchName: string]: string; // branchName -> parentBranchName
}

function loadParentRelationships(): ParentRelationships {
  try {
    const stored = localStorage.getItem(PARENT_RELATIONSHIPS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveParentRelationships(relationships: ParentRelationships): void {
  try {
    localStorage.setItem(PARENT_RELATIONSHIPS_KEY, JSON.stringify(relationships));
  } catch {
    // Ignore storage errors
  }
}

export interface WorktreeNode extends Worktree {
  id: string;
  parentId: string | null;
}

// Mock data for browser development
const MOCK_WORKTREES: WorktreeNode[] = [
  {
    id: "main-001",
    path: "/Users/dev/projects/myapp",
    head: "abc1234def5678",
    branch: "main",
    is_bare: false,
    is_detached: false,
    is_main: true,
    parentId: null,
  },
  {
    id: "feat-002",
    path: "/Users/dev/projects/myapp-feature-auth",
    head: "def5678abc1234",
    branch: "feature/authentication",
    is_bare: false,
    is_detached: false,
    is_main: false,
    parentId: "main-001",
  },
  {
    id: "fix-003",
    path: "/Users/dev/projects/myapp-fix-login",
    head: "789abc123def45",
    branch: "fix/login-bug",
    is_bare: false,
    is_detached: false,
    is_main: false,
    parentId: "main-001",
  },
  {
    id: "exp-004",
    path: "/Users/dev/projects/myapp-experiment",
    head: "456def789abc12",
    branch: "experiment/new-ui",
    is_bare: false,
    is_detached: false,
    is_main: false,
    parentId: "feat-002",
  },
];

interface WorktreeState {
  // Data
  worktrees: WorktreeNode[];
  mainRepoPath: string | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchWorktrees: (repoPath?: string) => Promise<void>;
  createNewWorktree: (
    branchName: string,
    baseBranch: string,
    path: string
  ) => Promise<void>;
  deleteWorktree: (worktreePath: string, force?: boolean) => Promise<void>;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useWorktreeStore = create<WorktreeState>()(
  immer((set, get) => ({
    worktrees: [],
    mainRepoPath: null,
    loading: false,
    error: null,

    fetchWorktrees: async (repoPath?: string) => {
      set({ loading: true, error: null });

      // Use mock data if not in Tauri
      if (!isTauri) {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 300));
        set({
          worktrees: MOCK_WORKTREES,
          mainRepoPath: "/Users/dev/projects/myapp",
          loading: false,
        });
        return;
      }

      try {
        const mainPath = repoPath || get().mainRepoPath || ".";
        set({ mainRepoPath: mainPath });

        const worktrees = await listWorktrees(mainPath);

        // Convert to WorktreeNode with IDs
        const worktreeNodes: WorktreeNode[] = worktrees.map((wt) => ({
          ...wt,
          id: generateId(),
          parentId: null,
        }));

        // Load stored parent relationships
        const parentRelationships = loadParentRelationships();

        // Build a map of branch -> worktree node for lookup
        const branchToNode = new Map<string, WorktreeNode>();
        worktreeNodes.forEach((wt) => {
          if (wt.branch) {
            branchToNode.set(wt.branch, wt);
          }
        });

        // Find parent relationships based on stored data or default to main
        const mainWorktree = worktreeNodes.find((wt) => wt.is_main);
        worktreeNodes.forEach((wt) => {
          if (!wt.is_main && wt.branch) {
            // Look up stored parent relationship
            const parentBranch = parentRelationships[wt.branch];
            if (parentBranch) {
              const parentNode = branchToNode.get(parentBranch);
              if (parentNode) {
                wt.parentId = parentNode.id;
                return;
              }
            }
            // Default to main if no stored relationship or parent not found
            if (mainWorktree) {
              wt.parentId = mainWorktree.id;
            }
          }
        });

        set({ worktrees: worktreeNodes, loading: false });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : String(error),
          loading: false,
        });
      }
    },

    createNewWorktree: async (
      branchName: string,
      baseBranch: string,
      path: string
    ) => {
      set({ loading: true, error: null });

      // Store the parent relationship before creating
      const parentRelationships = loadParentRelationships();
      parentRelationships[branchName] = baseBranch;
      saveParentRelationships(parentRelationships);

      // Mock mode for browser development
      if (!isTauri) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const { worktrees } = get();
        const parent = worktrees.find((wt) => wt.branch === baseBranch);
        const newWorktree: WorktreeNode = {
          id: generateId(),
          path,
          head: Math.random().toString(36).substring(2, 14),
          branch: branchName,
          is_bare: false,
          is_detached: false,
          is_main: false,
          parentId: parent?.id || null,
        };
        set((state) => {
          state.worktrees.push(newWorktree);
          state.loading = false;
        });
        return;
      }

      const { mainRepoPath } = get();
      if (!mainRepoPath) {
        set({ error: "No repository path set", loading: false });
        return;
      }

      try {
        console.log("Creating worktree:", { mainRepoPath, path, branchName, baseBranch });
        await createWorktree(mainRepoPath, path, branchName, baseBranch);
        await get().fetchWorktrees();
      } catch (error) {
        console.error("Failed to create worktree:", error);
        set({
          error: error instanceof Error ? error.message : String(error),
          loading: false,
        });
      }
    },

    deleteWorktree: async (worktreePath: string, force = false) => {
      set({ loading: true, error: null });

      // Find the branch name to clean up parent relationship
      const { worktrees } = get();
      const worktreeToDelete = worktrees.find((wt) => wt.path === worktreePath);
      if (worktreeToDelete?.branch) {
        const parentRelationships = loadParentRelationships();
        delete parentRelationships[worktreeToDelete.branch];
        saveParentRelationships(parentRelationships);
      }

      // Mock mode for browser development
      if (!isTauri) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        set((state) => {
          state.worktrees = state.worktrees.filter((wt) => wt.path !== worktreePath);
          state.loading = false;
        });
        return;
      }

      const { mainRepoPath } = get();
      if (!mainRepoPath) {
        set({ error: "No repository path set" });
        return;
      }

      try {
        await removeWorktree(mainRepoPath, worktreePath, force);
        await get().fetchWorktrees();
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : String(error),
          loading: false,
        });
      }
    },

    setError: (error) => set({ error }),
    clearError: () => set({ error: null }),
  }))
);

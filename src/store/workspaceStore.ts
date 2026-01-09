import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { readDirectory, readFile, writeFile } from "@/lib/tauri";
import { generateId, filterAndSortEntries } from "@/lib/utils";

export interface FileTreeNode {
  path: string;
  name: string;
  type: "file" | "directory";
  children?: FileTreeNode[];
}

export interface OpenFile {
  id: string;
  path: string;
  name: string;
  content: string;
  originalContent: string;
  isDirty: boolean;
  language: string;
}

interface WorkspaceState {
  // File tree state
  fileTree: FileTreeNode[];
  expandedDirs: Set<string>;
  selectedPath: string | null;
  loadingTree: boolean;

  // Editor state
  openFiles: OpenFile[];
  activeFileId: string | null;

  // Actions
  loadFileTree: (rootPath: string) => Promise<void>;
  toggleDirectory: (path: string) => Promise<void>;
  selectFile: (path: string) => void;
  openFile: (path: string) => Promise<void>;
  closeFile: (fileId: string) => void;
  setActiveFile: (fileId: string) => void;
  updateFileContent: (fileId: string, content: string) => void;
  saveFile: (fileId: string) => Promise<void>;
  reset: () => void;
}

// Detect language from file extension
const LANGUAGE_MAP: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  json: "json",
  md: "markdown",
  css: "css",
  scss: "scss",
  html: "html",
  rs: "rust",
  py: "python",
  go: "go",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
};

function detectLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return LANGUAGE_MAP[ext] || "plaintext";
}

export const useWorkspaceStore = create<WorkspaceState>()(
  immer((set, get) => ({
    // File tree state
    fileTree: [],
    expandedDirs: new Set<string>(),
    selectedPath: null,
    loadingTree: false,

    // Editor state
    openFiles: [],
    activeFileId: null,

    loadFileTree: async (rootPath: string) => {
      set({ loadingTree: true });
      try {
        const entries = await readDirectory(rootPath);
        const filtered = filterAndSortEntries(entries);
        set({ fileTree: filtered, loadingTree: false });
      } catch (error) {
        console.error("Failed to load file tree:", error);
        set({ loadingTree: false });
      }
    },

    toggleDirectory: async (path: string) => {
      const { expandedDirs } = get();
      const isExpanded = expandedDirs.has(path);

      if (isExpanded) {
        // Collapse
        set((state) => {
          state.expandedDirs.delete(path);
        });
      } else {
        // Expand - load children
        try {
          const entries = await readDirectory(path);
          const filtered = filterAndSortEntries(entries);

          // Find and update the node in the tree
          const updateTree = (nodes: FileTreeNode[]): FileTreeNode[] => {
            return nodes.map((node) => {
              if (node.path === path) {
                return { ...node, children: filtered };
              }
              if (node.children) {
                return { ...node, children: updateTree(node.children) };
              }
              return node;
            });
          };

          set((state) => {
            state.fileTree = updateTree(state.fileTree);
            state.expandedDirs.add(path);
          });
        } catch (error) {
          console.error("Failed to load directory:", error);
        }
      }
    },

    selectFile: (path: string) => {
      set({ selectedPath: path });
    },

    openFile: async (path: string) => {
      const { openFiles } = get();

      // Check if file is already open
      const existingFile = openFiles.find((f) => f.path === path);
      if (existingFile) {
        set({ activeFileId: existingFile.id, selectedPath: path });
        return;
      }

      try {
        const content = await readFile(path);
        const name = path.split("/").pop() || path;
        const language = detectLanguage(name);
        const id = generateId();

        set((state) => {
          state.openFiles.push({
            id,
            path,
            name,
            content,
            originalContent: content,
            isDirty: false,
            language,
          });
          state.activeFileId = id;
          state.selectedPath = path;
        });
      } catch (error) {
        console.error("Failed to open file:", error);
      }
    },

    closeFile: (fileId: string) => {
      set((state) => {
        const index = state.openFiles.findIndex((f) => f.id === fileId);
        if (index !== -1) {
          state.openFiles.splice(index, 1);

          // Update active file if we closed the active one
          if (state.activeFileId === fileId) {
            if (state.openFiles.length > 0) {
              // Select the previous file, or the first one
              const newIndex = Math.max(0, index - 1);
              state.activeFileId = state.openFiles[newIndex]?.id || null;
            } else {
              state.activeFileId = null;
            }
          }
        }
      });
    },

    setActiveFile: (fileId: string) => {
      set({ activeFileId: fileId });
    },

    updateFileContent: (fileId: string, content: string) => {
      set((state) => {
        const file = state.openFiles.find((f) => f.id === fileId);
        if (file) {
          file.content = content;
          file.isDirty = content !== file.originalContent;
        }
      });
    },

    saveFile: async (fileId: string) => {
      const { openFiles } = get();
      const file = openFiles.find((f) => f.id === fileId);

      if (!file) return;

      try {
        await writeFile(file.path, file.content);
        set((state) => {
          const f = state.openFiles.find((f) => f.id === fileId);
          if (f) {
            f.originalContent = f.content;
            f.isDirty = false;
          }
        });
      } catch (error) {
        console.error("Failed to save file:", error);
      }
    },

    reset: () => {
      set({
        fileTree: [],
        expandedDirs: new Set(),
        selectedPath: null,
        loadingTree: false,
        openFiles: [],
        activeFileId: null,
      });
    },
  }))
);

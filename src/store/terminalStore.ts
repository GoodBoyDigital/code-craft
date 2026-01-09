import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { generateId } from "@/lib/utils";

export interface TerminalInstance {
  id: string;
  worktreePath: string;
  title: string;
  isActive: boolean;
}

interface TerminalState {
  terminals: TerminalInstance[];
  activeTerminalId: string | null;

  // Actions
  createTerminal: (worktreePath: string, title?: string) => string;
  closeTerminal: (id: string) => void;
  setActiveTerminal: (id: string | null) => void;
  getTerminalForWorktree: (worktreePath: string) => TerminalInstance | undefined;
}

export const useTerminalStore = create<TerminalState>()(
  immer((set, get) => ({
    terminals: [],
    activeTerminalId: null,

    createTerminal: (worktreePath: string, title?: string) => {
      // Check if terminal already exists for this worktree
      const existing = get().getTerminalForWorktree(worktreePath);
      if (existing) {
        set({ activeTerminalId: existing.id });
        return existing.id;
      }

      const id = generateId();
      const terminal: TerminalInstance = {
        id,
        worktreePath,
        title: title || worktreePath.split("/").pop() || "Terminal",
        isActive: true,
      };

      set((state) => {
        // Mark all other terminals as inactive
        state.terminals.forEach((t) => (t.isActive = false));
        state.terminals.push(terminal);
        state.activeTerminalId = id;
      });

      return id;
    },

    closeTerminal: (id: string) => {
      set((state) => {
        const index = state.terminals.findIndex((t) => t.id === id);
        if (index !== -1) {
          state.terminals.splice(index, 1);
        }

        // If closing active terminal, activate the last one
        if (state.activeTerminalId === id) {
          const lastTerminal = state.terminals[state.terminals.length - 1];
          state.activeTerminalId = lastTerminal?.id || null;
          if (lastTerminal) {
            lastTerminal.isActive = true;
          }
        }
      });
    },

    setActiveTerminal: (id: string | null) => {
      set((state) => {
        state.terminals.forEach((t) => (t.isActive = t.id === id));
        state.activeTerminalId = id;
      });
    },

    getTerminalForWorktree: (worktreePath: string) => {
      return get().terminals.find((t) => t.worktreePath === worktreePath);
    },
  }))
);

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export type ClaudeStatus = "idle" | "working" | "stopped";

export interface ClaudeSession {
  worktreeId: string;
  sessionId: string;
  status: ClaudeStatus;
  lastActivityAt: number;
  outputBuffer: string[]; // Recent output lines for reconnection
  isConnected: boolean; // Whether UI is currently connected
}

interface TerminalState {
  // Claude sessions by worktree ID
  claudeSessions: Record<string, ClaudeSession>;

  // Actions
  createClaudeSession: (worktreeId: string, sessionId: string) => void;
  updateClaudeStatus: (worktreeId: string, status: ClaudeStatus) => void;
  appendOutput: (worktreeId: string, output: string) => void;
  setConnected: (worktreeId: string, connected: boolean) => void;
  getClaudeSession: (worktreeId: string) => ClaudeSession | undefined;
  stopClaudeSession: (worktreeId: string) => void;
  recordActivity: (worktreeId: string) => void;
}

// Max lines to keep in output buffer
const MAX_OUTPUT_LINES = 1000;

// Time after last activity to consider "idle" (ms)
const IDLE_THRESHOLD = 2000;

export const useTerminalStore = create<TerminalState>()(
  immer((set, get) => ({
    claudeSessions: {},

    createClaudeSession: (worktreeId: string, sessionId: string) => {
      set((state) => {
        // Only create if doesn't exist
        if (!state.claudeSessions[worktreeId]) {
          state.claudeSessions[worktreeId] = {
            worktreeId,
            sessionId,
            status: "idle",
            lastActivityAt: Date.now(),
            outputBuffer: [],
            isConnected: true,
          };
        } else {
          // Session exists, just mark as connected
          state.claudeSessions[worktreeId].isConnected = true;
        }
      });
    },

    updateClaudeStatus: (worktreeId: string, status: ClaudeStatus) => {
      set((state) => {
        const session = state.claudeSessions[worktreeId];
        if (session) {
          session.status = status;
          if (status === "working") {
            session.lastActivityAt = Date.now();
          }
        }
      });
    },

    appendOutput: (worktreeId: string, output: string) => {
      set((state) => {
        const session = state.claudeSessions[worktreeId];
        if (session) {
          // Append output, keeping buffer limited
          session.outputBuffer.push(output);
          if (session.outputBuffer.length > MAX_OUTPUT_LINES) {
            session.outputBuffer = session.outputBuffer.slice(-MAX_OUTPUT_LINES);
          }
          // Update activity and status
          session.lastActivityAt = Date.now();
          session.status = "working";
        }
      });
    },

    setConnected: (worktreeId: string, connected: boolean) => {
      set((state) => {
        const session = state.claudeSessions[worktreeId];
        if (session) {
          session.isConnected = connected;
        }
      });
    },

    getClaudeSession: (worktreeId: string) => {
      return get().claudeSessions[worktreeId];
    },

    stopClaudeSession: (worktreeId: string) => {
      set((state) => {
        const session = state.claudeSessions[worktreeId];
        if (session) {
          session.status = "stopped";
        }
      });
    },

    recordActivity: (worktreeId: string) => {
      set((state) => {
        const session = state.claudeSessions[worktreeId];
        if (session) {
          session.lastActivityAt = Date.now();
        }
      });
    },
  }))
);

// Helper to check if a session is actively working
export function isClaudeWorking(session: ClaudeSession | undefined): boolean {
  if (!session) return false;
  if (session.status === "stopped") return false;

  // Consider working if had activity recently
  const timeSinceActivity = Date.now() - session.lastActivityAt;
  return session.status === "working" && timeSinceActivity < IDLE_THRESHOLD;
}

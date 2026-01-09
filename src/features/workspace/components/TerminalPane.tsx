import { useEffect, useRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import {
  createPtySession,
  writeToPty,
  closePtySession,
  onPtyOutput,
} from "@/lib/tauri";
import { useTerminalStore } from "@/store";
import { isTauri } from "@/lib/environment";
import { terminalTheme, terminalOptions } from "@/lib/terminal-theme";

interface TerminalPaneProps {
  worktreeId: string;
  worktreePath: string;
  command?: string; // Optional command to run (e.g., "claude")
  title?: string;
  persistent?: boolean; // If true, session persists when unmounted (for Claude)
}

export function TerminalPane({
  worktreeId,
  worktreePath,
  command,
  title,
  persistent = false,
}: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const unlistenRef = useRef<(() => void) | null>(null);
  const sessionIdRef = useRef<string>("");

  const {
    createClaudeSession,
    appendOutput,
    setConnected,
    getClaudeSession,
  } = useTerminalStore();

  // Generate stable session ID for persistent sessions
  const getSessionId = useCallback(() => {
    if (persistent) {
      // Use stable ID based on worktree for persistent sessions
      return `claude-${worktreeId}`;
    } else {
      // Use unique ID for non-persistent sessions
      if (!sessionIdRef.current) {
        sessionIdRef.current = `shell-${worktreeId}-${Date.now()}`;
      }
      return sessionIdRef.current;
    }
  }, [worktreeId, persistent]);

  const initTerminal = useCallback(async () => {
    if (!containerRef.current) return;

    const sessionId = getSessionId();
    const existingSession = persistent ? getClaudeSession(worktreeId) : null;
    const isReconnecting = existingSession && existingSession.outputBuffer.length > 0;

    // Create terminal instance
    const terminal = new Terminal({
      theme: terminalTheme,
      ...terminalOptions,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    terminal.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    if (isTauri) {
      try {
        // For persistent sessions, check if we're reconnecting
        if (isReconnecting && existingSession) {
          // Replay buffered output
          for (const output of existingSession.outputBuffer) {
            terminal.write(output);
          }
        }

        // Create or reconnect to PTY session
        await createPtySession(sessionId, worktreePath, command);

        // Track session in store for persistent sessions
        if (persistent) {
          createClaudeSession(worktreeId, sessionId);
        }

        // Listen for PTY output
        const unlisten = await onPtyOutput(sessionId, (data) => {
          terminal.write(data);
          // Buffer output for persistent sessions
          if (persistent) {
            appendOutput(worktreeId, data);
          }
        });
        unlistenRef.current = unlisten;

        // Send terminal input to PTY
        terminal.onData((data) => {
          writeToPty(sessionId, data);
        });
      } catch (error) {
        console.error("Failed to create PTY session:", error);
        terminal.writeln(`\x1b[31mFailed to start terminal: ${error}\x1b[0m`);
      }
    } else {
      // Mock mode for browser development
      terminal.writeln("\x1b[33mTerminal (mock mode - PTY not available)\x1b[0m");
      terminal.writeln(`Working directory: ${worktreePath}`);
      if (command) {
        terminal.writeln(`Command: ${command}`);
      }
      terminal.write("\r\n$ ");

      // Echo typed characters
      terminal.onData((data) => {
        if (data === "\r") {
          terminal.write("\r\n$ ");
        } else if (data === "\x7f") {
          terminal.write("\b \b");
        } else {
          terminal.write(data);
        }
      });

      // Track mock session
      if (persistent) {
        createClaudeSession(worktreeId, sessionId);
      }
    }

    // Handle resize
    const handleResize = () => {
      fitAddon.fit();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [
    getSessionId,
    worktreeId,
    worktreePath,
    command,
    persistent,
    getClaudeSession,
    createClaudeSession,
    appendOutput,
  ]);

  useEffect(() => {
    initTerminal();

    return () => {
      if (unlistenRef.current) {
        unlistenRef.current();
      }

      if (persistent) {
        setConnected(worktreeId, false);
      } else if (isTauri) {
        closePtySession(getSessionId()).catch(console.error);
      }

      if (terminalRef.current) {
        terminalRef.current.dispose();
      }
    };
  }, [initTerminal, persistent, worktreeId, getSessionId, setConnected]);

  return (
    <div className="h-full flex flex-col bg-bg-primary">
      {title && (
        <div className="px-3 py-1.5 text-xs font-medium text-text-secondary uppercase tracking-wide border-b border-border-subtle bg-bg-secondary">
          {title}
        </div>
      )}
      <div ref={containerRef} className="flex-1 p-2" />
    </div>
  );
}

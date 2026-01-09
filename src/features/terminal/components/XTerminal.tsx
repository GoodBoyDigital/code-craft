import { useEffect, useRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

interface XTerminalProps {
  worktreePath: string;
}

export function XTerminal({ worktreePath }: XTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: "bar",
      fontSize: 13,
      fontFamily: '"JetBrains Mono", "SF Mono", Menlo, Monaco, Consolas, monospace',
      lineHeight: 1.4,
      theme: {
        background: "#12121a",
        foreground: "#f4f4f5",
        cursor: "#6366f1",
        cursorAccent: "#12121a",
        selectionBackground: "rgba(99, 102, 241, 0.3)",
        black: "#0a0a0f",
        red: "#ef4444",
        green: "#22c55e",
        yellow: "#f59e0b",
        blue: "#6366f1",
        magenta: "#a855f7",
        cyan: "#06b6d4",
        white: "#f4f4f5",
        brightBlack: "#71717a",
        brightRed: "#f87171",
        brightGreen: "#4ade80",
        brightYellow: "#fbbf24",
        brightBlue: "#818cf8",
        brightMagenta: "#c084fc",
        brightCyan: "#22d3ee",
        brightWhite: "#ffffff",
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Welcome message
    term.writeln("\x1b[1;34m╭──────────────────────────────────────────╮\x1b[0m");
    term.writeln("\x1b[1;34m│\x1b[0m  \x1b[1;36mMuscat Terminal\x1b[0m                         \x1b[1;34m│\x1b[0m");
    term.writeln("\x1b[1;34m╰──────────────────────────────────────────╯\x1b[0m");
    term.writeln("");
    term.writeln(`\x1b[90mWorktree: ${worktreePath}\x1b[0m`);
    term.writeln("");
    term.writeln("\x1b[33mNote: Terminal backend (PTY) not yet connected.\x1b[0m");
    term.writeln("\x1b[33mThis will be implemented with tauri-plugin-pty.\x1b[0m");
    term.writeln("");
    term.write("\x1b[32m$\x1b[0m ");

    // Handle input (echo for now)
    let currentLine = "";
    term.onData((data) => {
      switch (data) {
        case "\r": // Enter
          term.writeln("");
          if (currentLine.trim()) {
            term.writeln(`\x1b[90mCommand: ${currentLine}\x1b[0m`);
            term.writeln("\x1b[33mPTY not connected - command not executed\x1b[0m");
          }
          currentLine = "";
          term.write("\x1b[32m$\x1b[0m ");
          break;
        case "\u007F": // Backspace
          if (currentLine.length > 0) {
            currentLine = currentLine.slice(0, -1);
            term.write("\b \b");
          }
          break;
        default:
          if (data >= " " || data === "\t") {
            currentLine += data;
            term.write(data);
          }
      }
    });

    return () => {
      term.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, [worktreePath]);

  // Handle resize
  const handleResize = useCallback(() => {
    fitAddonRef.current?.fit();
  }, []);

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  return (
    <div
      ref={terminalRef}
      className="h-full w-full"
      style={{ padding: "8px" }}
    />
  );
}

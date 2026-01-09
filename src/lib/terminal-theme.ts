/**
 * Shared terminal theme configuration for xterm.js
 * Used by all terminal instances for consistent appearance
 */

import type { ITheme } from "@xterm/xterm";

export const terminalTheme: ITheme = {
  background: "#0a0a0f",
  foreground: "#f4f4f5",
  cursor: "#6366f1",
  cursorAccent: "#0a0a0f",
  selectionBackground: "rgba(99, 102, 241, 0.3)",
  black: "#18181b",
  red: "#ef4444",
  green: "#22c55e",
  yellow: "#f59e0b",
  blue: "#3b82f6",
  magenta: "#a855f7",
  cyan: "#06b6d4",
  white: "#f4f4f5",
  brightBlack: "#3f3f46",
  brightRed: "#f87171",
  brightGreen: "#4ade80",
  brightYellow: "#fbbf24",
  brightBlue: "#60a5fa",
  brightMagenta: "#c084fc",
  brightCyan: "#22d3ee",
  brightWhite: "#ffffff",
};

export const terminalOptions = {
  fontFamily: '"JetBrains Mono", "SF Mono", Menlo, Monaco, monospace',
  fontSize: 13,
  lineHeight: 1.4,
  cursorBlink: true,
  cursorStyle: "bar" as const,
  scrollback: 10000,
};

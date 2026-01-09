import { useEffect, useCallback } from "react";
import Editor, { loader } from "@monaco-editor/react";
import { useWorkspaceStore } from "@/store";
import { cn } from "@/lib/utils";

// Configure Monaco theme
loader.init().then((monaco) => {
  monaco.editor.defineTheme("codecraft-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6b7280" },
      { token: "keyword", foreground: "c084fc" },
      { token: "string", foreground: "86efac" },
      { token: "number", foreground: "fcd34d" },
      { token: "type", foreground: "67e8f9" },
    ],
    colors: {
      "editor.background": "#0a0a0f",
      "editor.foreground": "#f4f4f5",
      "editorCursor.foreground": "#6366f1",
      "editor.lineHighlightBackground": "#12121a",
      "editorLineNumber.foreground": "#4b5563",
      "editorLineNumber.activeForeground": "#9ca3af",
      "editor.selectionBackground": "#6366f140",
      "editor.inactiveSelectionBackground": "#6366f120",
      "editorIndentGuide.background": "#1f1f2e",
      "editorIndentGuide.activeBackground": "#3f3f5a",
      "editorWidget.background": "#12121a",
      "editorWidget.border": "#27272a",
      "editorSuggestWidget.background": "#12121a",
      "editorSuggestWidget.border": "#27272a",
      "editorSuggestWidget.selectedBackground": "#27272a",
      "scrollbarSlider.background": "#27272a80",
      "scrollbarSlider.hoverBackground": "#3f3f5a80",
      "scrollbarSlider.activeBackground": "#4f4f6a80",
    },
  });
});

interface FileTabProps {
  name: string;
  isDirty: boolean;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
}

function FileTab({ name, isDirty, isActive, onClick, onClose }: FileTabProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 text-sm cursor-pointer",
        "border-r border-border-subtle",
        isActive
          ? "bg-bg-primary text-text-primary"
          : "bg-bg-secondary text-text-secondary hover:text-text-primary"
      )}
      onClick={onClick}
    >
      <span className="truncate max-w-[120px]">{name}</span>
      {isDirty && (
        <span className="w-2 h-2 rounded-full bg-accent-primary shrink-0" />
      )}
      <button
        className="ml-1 p-0.5 rounded hover:bg-bg-hover"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </div>
  );
}

export function MonacoEditorPane() {
  const {
    openFiles,
    activeFileId,
    setActiveFile,
    closeFile,
    updateFileContent,
    saveFile,
  } = useWorkspaceStore();

  const activeFile = openFiles.find((f) => f.id === activeFileId);

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (activeFile && value !== undefined) {
        updateFileContent(activeFile.id, value);
      }
    },
    [activeFile, updateFileContent]
  );

  // Handle Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (activeFile) {
          saveFile(activeFile.id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeFile, saveFile]);

  return (
    <div className="h-full flex flex-col bg-bg-primary">
      {/* Tab bar */}
      <div className="h-9 flex items-center bg-bg-secondary border-b border-border-subtle overflow-x-auto">
        {openFiles.map((file) => (
          <FileTab
            key={file.id}
            name={file.name}
            isDirty={file.isDirty}
            isActive={file.id === activeFileId}
            onClick={() => setActiveFile(file.id)}
            onClose={() => closeFile(file.id)}
          />
        ))}
      </div>

      {/* Editor */}
      <div className="flex-1">
        {activeFile ? (
          <Editor
            theme="codecraft-dark"
            language={activeFile.language}
            value={activeFile.content}
            onChange={handleEditorChange}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: '"JetBrains Mono", "SF Mono", monospace',
              lineHeight: 1.6,
              padding: { top: 8 },
              scrollBeyondLastLine: false,
              renderLineHighlight: "line",
              cursorBlinking: "smooth",
              cursorSmoothCaretAnimation: "on",
              smoothScrolling: true,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: "on",
              bracketPairColorization: { enabled: true },
            }}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-text-tertiary">
            <div className="text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mx-auto mb-3 opacity-50"
              >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <p className="text-sm">Select a file to edit</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

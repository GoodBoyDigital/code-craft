import { useEffect, useRef } from "react";
import { useUIStore, useWorkspaceStore, type WorktreeNode } from "@/store";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { FileTree } from "./FileTree";
import { MonacoEditorPane } from "./MonacoEditorPane";
import { TerminalPane } from "./TerminalPane";

interface WorkspaceViewProps {
  worktree: WorktreeNode;
}

export function WorkspaceView({ worktree }: WorkspaceViewProps) {
  const { closeWorkspace } = useUIStore();
  const { reset } = useWorkspaceStore();
  const hasInitialized = useRef(false);

  // Reset workspace state when worktree changes
  useEffect(() => {
    if (hasInitialized.current) {
      reset();
    }
    hasInitialized.current = true;
  }, [worktree.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-full w-full flex flex-col bg-bg-primary overflow-hidden">
      <WorkspaceHeader worktree={worktree} onBack={closeWorkspace} />

      {/* Main workspace area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Claude Terminal (fixed width) */}
        <div className="w-[520px] shrink-0 border-r border-border-subtle flex flex-col overflow-hidden">
          <TerminalPane
            worktreeId={worktree.id}
            worktreePath={worktree.path}
            command="claude"
            title="Claude Code"
            persistent={true}
          />
        </div>

        {/* Right: Editor Area (65%) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top: File Tree + Editor (70%) */}
          <div className="flex-[7] flex border-b border-border-subtle overflow-hidden min-h-0">
            {/* File Tree (25% of right side) */}
            <div className="w-[220px] min-w-[180px] max-w-[300px] border-r border-border-subtle overflow-hidden">
              <FileTree rootPath={worktree.path} />
            </div>

            {/* Monaco Editor */}
            <div className="flex-1 overflow-hidden">
              <MonacoEditorPane />
            </div>
          </div>

          {/* Bottom: Shell Terminal (30%) */}
          <div className="flex-[3] overflow-hidden min-h-0">
            <TerminalPane
              worktreeId={worktree.id}
              worktreePath={worktree.path}
              title="Terminal"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

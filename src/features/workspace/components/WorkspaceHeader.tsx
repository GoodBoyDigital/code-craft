import { Button } from "@/components/ui";
import { truncatePath } from "@/lib/utils";
import type { WorktreeNode } from "@/store";

interface WorkspaceHeaderProps {
  worktree: WorktreeNode;
  onBack: () => void;
}

export function WorkspaceHeader({ worktree, onBack }: WorkspaceHeaderProps) {
  return (
    <div className="h-11 px-4 flex items-center gap-3 bg-bg-secondary border-b border-border-default shrink-0" data-tauri-drag-region>
      <Button variant="ghost" size="sm" onClick={onBack}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-1"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        Back
      </Button>

      <div className="h-4 w-px bg-border-default" />

      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            worktree.is_main ? "bg-accent-success" : "bg-accent-primary"
          }`}
        />
        <span className="text-sm text-text-primary font-medium">
          {worktree.branch || "detached"}
        </span>
        {worktree.is_main && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent-success/20 text-accent-success">
            main
          </span>
        )}
      </div>

      <span className="text-xs text-text-tertiary font-mono">
        {truncatePath(worktree.path, 50)}
      </span>
    </div>
  );
}

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { motion } from "framer-motion";
import { cn, truncatePath } from "@/lib/utils";
import { Button } from "@/components/ui";
import { useUIStore } from "@/store";
import type { WorktreeNode as WorktreeNodeType } from "@/store/worktreeStore";

interface WorktreeNodeProps {
  data: { worktree: WorktreeNodeType };
  selected?: boolean;
}

export const WorktreeNode = memo(function WorktreeNode({
  data,
  selected,
}: WorktreeNodeProps) {
  const { worktree } = data;
  const { openModal, openPanel, selectWorktree } = useUIStore();

  const handleFork = (e: React.MouseEvent) => {
    e.stopPropagation();
    openModal("fork", {
      baseBranch: worktree.branch || "HEAD",
      sourceWorktreeId: worktree.id,
    });
  };

  const handleDone = (e: React.MouseEvent) => {
    e.stopPropagation();
    openModal("merge", {
      sourceBranch: worktree.branch || "",
      worktreePath: worktree.path,
    });
  };

  const handleTerminal = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectWorktree(worktree.id);
    openPanel("terminal");
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "w-[260px] rounded-xl",
        "bg-bg-secondary border",
        "transition-all duration-150",
        selected
          ? "border-accent-primary shadow-lg shadow-glow-primary"
          : "border-border-default hover:border-border-default",
        worktree.is_main && "ring-1 ring-accent-success/30"
      )}
    >
      {/* Input handle */}
      {!worktree.is_main && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-bg-elevated !border-2 !border-border-default"
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border-subtle">
        <span
          className={cn(
            "w-2 h-2 rounded-full",
            worktree.is_main ? "bg-accent-success" : "bg-accent-primary"
          )}
        />
        <span className="font-medium text-sm text-text-primary truncate flex-1">
          {worktree.branch || "detached"}
        </span>
        {worktree.is_main && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent-success/20 text-accent-success">
            main
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-3 py-2.5 space-y-1">
        <div
          className="font-mono text-xs text-text-secondary truncate"
          title={worktree.path}
        >
          {truncatePath(worktree.path, 35)}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
          <span className="font-mono">{worktree.head.slice(0, 7)}</span>
          {worktree.is_detached && (
            <span className="text-accent-warning">(detached)</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 border-t border-border-subtle">
        <Button variant="ghost" size="sm" onClick={handleFork}>
          Fork
        </Button>
        <Button variant="ghost" size="sm" onClick={handleTerminal}>
          Terminal
        </Button>
        {!worktree.is_main && (
          <Button variant="ghost" size="sm" onClick={handleDone}>
            Done
          </Button>
        )}
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-bg-elevated !border-2 !border-border-default"
      />
    </motion.div>
  );
});

import { useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { WorktreeCanvas } from "@/features/worktree-graph/components/WorktreeCanvas";
import { Sidebar } from "@/components/layout";
import { useProjectStore, useWorktreeStore } from "@/store";

function App() {
  const { activeProjectId, getActiveProject } = useProjectStore();
  const { fetchWorktrees } = useWorktreeStore();

  // Fetch worktrees when active project changes
  useEffect(() => {
    const project = getActiveProject();
    if (project) {
      fetchWorktrees(project.path);
    }
  }, [activeProjectId, getActiveProject, fetchWorktrees]);

  return (
    <div className="h-full w-full bg-bg-primary flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 relative">
        {activeProjectId ? (
          <ReactFlowProvider>
            <WorktreeCanvas />
          </ReactFlowProvider>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-primary/20 to-accent-success/20 flex items-center justify-center mx-auto mb-4">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-accent-primary"
          >
            <circle cx="12" cy="18" r="3" />
            <circle cx="6" cy="6" r="3" />
            <circle cx="18" cy="6" r="3" />
            <path d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9" />
            <path d="M12 12v3" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-text-primary mb-2">
          No Project Selected
        </h2>
        <p className="text-sm text-text-secondary mb-4">
          Open a Git repository to start managing your worktrees visually.
        </p>
        <p className="text-xs text-text-tertiary">
          Click "Open Repository" in the sidebar to get started.
        </p>
      </div>
    </div>
  );
}

export default App;

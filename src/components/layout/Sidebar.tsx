import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { open } from "@tauri-apps/plugin-dialog";
import { cn, formatRelativeTime } from "@/lib/utils";
import { isTauri } from "@/lib/environment";
import { useProjectStore, useWorktreeStore } from "@/store";
import { Button } from "@/components/ui";

export function Sidebar() {
  const { projects, activeProjectId, addProject, removeProject, setActiveProject } =
    useProjectStore();
  const { fetchWorktrees } = useWorktreeStore();

  // Sort projects by last opened
  const sortedProjects = [...projects].sort((a, b) => b.lastOpened - a.lastOpened);

  const handleOpenFolder = useCallback(async () => {
    if (isTauri) {
      try {
        const selected = await open({
          directory: true,
          multiple: false,
          title: "Select Git Repository",
        });

        if (selected && typeof selected === "string") {
          const project = addProject(selected);
          // Fetch worktrees for the new project
          await fetchWorktrees(project.path);
        }
      } catch (error) {
        console.error("Failed to open folder:", error);
      }
    } else {
      // Mock mode: Add a fake project for testing
      const mockPath = `/Users/dev/projects/mock-project-${Date.now()}`;
      addProject(mockPath, "Mock Project");
    }
  }, [addProject, fetchWorktrees]);

  const handleSelectProject = useCallback(
    async (projectId: string) => {
      const project = projects.find((p) => p.id === projectId);
      if (project) {
        setActiveProject(projectId);
        await fetchWorktrees(project.path);
      }
    },
    [projects, setActiveProject, fetchWorktrees]
  );

  const handleRemoveProject = useCallback(
    (e: React.MouseEvent, projectId: string) => {
      e.stopPropagation();
      removeProject(projectId);
    },
    [removeProject]
  );

  return (
    <div className="w-[240px] h-full bg-bg-secondary border-r border-border-subtle flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border-subtle">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-accent-primary to-accent-success flex items-center justify-center">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
            </svg>
          </div>
          <span className="font-semibold text-text-primary">Muscat</span>
        </div>
        <Button
          variant="default"
          size="sm"
          className="w-full justify-start"
          onClick={handleOpenFolder}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            <line x1="12" y1="11" x2="12" y2="17" />
            <line x1="9" y1="14" x2="15" y2="14" />
          </svg>
          Open Repository
        </Button>
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="text-xs font-medium text-text-tertiary px-2 py-1.5 uppercase tracking-wider">
          Projects
        </div>

        <AnimatePresence mode="popLayout">
          {sortedProjects.length === 0 ? (
            <div className="text-sm text-text-tertiary text-center py-8 px-4">
              No projects yet.
              <br />
              Click "Open Repository" to get started.
            </div>
          ) : (
            sortedProjects.map((project) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
              >
                <button
                  onClick={() => handleSelectProject(project.id)}
                  className={cn(
                    "w-full text-left px-2 py-2 rounded-lg mb-1",
                    "transition-colors duration-100",
                    "group relative",
                    activeProjectId === project.id
                      ? "bg-accent-primary/10 text-text-primary"
                      : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                  )}
                >
                  <div className="flex items-start gap-2">
                    {/* Git icon */}
                    <div
                      className={cn(
                        "w-5 h-5 rounded flex items-center justify-center mt-0.5 shrink-0",
                        activeProjectId === project.id
                          ? "bg-accent-primary/20 text-accent-primary"
                          : "bg-bg-elevated text-text-tertiary"
                      )}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="18" r="3" />
                        <circle cx="6" cy="6" r="3" />
                        <circle cx="18" cy="6" r="3" />
                        <path d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9" />
                        <path d="M12 12v3" />
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {project.name}
                      </div>
                      <div className="text-xs text-text-tertiary truncate">
                        {formatRelativeTime(new Date(project.lastOpened))}
                      </div>
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={(e) => handleRemoveProject(e, project.id)}
                      className={cn(
                        "p-1 rounded opacity-0 group-hover:opacity-100",
                        "text-text-tertiary hover:text-accent-danger hover:bg-accent-danger/10",
                        "transition-all duration-100"
                      )}
                      title="Remove project"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border-subtle">
        <div className="text-xs text-text-tertiary text-center">
          {projects.length} project{projects.length !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}

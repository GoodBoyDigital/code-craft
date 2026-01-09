import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { generateId } from "@/lib/utils";

export interface Project {
  id: string;
  name: string;
  path: string;
  lastOpened: number;
}

interface ProjectState {
  projects: Project[];
  activeProjectId: string | null;

  // Actions
  addProject: (path: string, name?: string) => Project;
  removeProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;
  updateLastOpened: (id: string) => void;
  getActiveProject: () => Project | undefined;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    immer((set, get) => ({
      projects: [],
      activeProjectId: null,

      addProject: (path: string, name?: string) => {
        // Check if project already exists
        const existing = get().projects.find((p) => p.path === path);
        if (existing) {
          set({ activeProjectId: existing.id });
          get().updateLastOpened(existing.id);
          return existing;
        }

        // Extract name from path if not provided
        const projectName = name || path.split("/").pop() || "Untitled";

        const project: Project = {
          id: generateId(),
          name: projectName,
          path,
          lastOpened: Date.now(),
        };

        set((state) => {
          state.projects.push(project);
          state.activeProjectId = project.id;
        });

        return project;
      },

      removeProject: (id: string) => {
        set((state) => {
          state.projects = state.projects.filter((p) => p.id !== id);
          if (state.activeProjectId === id) {
            state.activeProjectId = state.projects[0]?.id || null;
          }
        });
      },

      setActiveProject: (id: string | null) => {
        set({ activeProjectId: id });
        if (id) {
          get().updateLastOpened(id);
        }
      },

      updateLastOpened: (id: string) => {
        set((state) => {
          const project = state.projects.find((p) => p.id === id);
          if (project) {
            project.lastOpened = Date.now();
          }
        });
      },

      getActiveProject: () => {
        const { projects, activeProjectId } = get();
        return projects.find((p) => p.id === activeProjectId);
      },
    })),
    {
      name: "codecraft-projects",
      partialize: (state) => ({
        projects: state.projects,
        activeProjectId: state.activeProjectId,
      }),
    }
  )
);

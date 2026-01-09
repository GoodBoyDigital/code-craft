import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { loadFromStorage, saveToStorage } from "@/lib/storage";

type ModalType = "fork" | "merge" | "delete" | null;

interface ModalData {
  baseBranch?: string;
  basePath?: string;
  worktreePath?: string;
  sourceBranch?: string;
  targetBranch?: string;
  sourceWorktreeId?: string;
}

interface NodePosition {
  x: number;
  y: number;
}

interface UIState {
  // Selection
  selectedWorktreeId: string | null;
  selectWorktree: (id: string | null) => void;

  // Workspace View (full IDE view)
  openWorktreeId: string | null;
  openWorktree: (id: string) => void;
  closeWorkspace: () => void;

  // Modals
  activeModal: ModalType;
  modalData: ModalData;
  openModal: (modal: ModalType, data?: ModalData) => void;
  closeModal: () => void;

  // Node positions (for manual layout persistence)
  nodePositions: Record<string, NodePosition>;
  setNodePosition: (id: string, position: NodePosition) => void;
  savePositions: () => void;
  loadPositions: () => void;

  // Layout mode
  autoLayout: boolean;
  toggleAutoLayout: () => void;
}

const POSITIONS_STORAGE_KEY = "muscat-node-positions";

export const useUIStore = create<UIState>()(
  immer((set, get) => ({
    // Selection
    selectedWorktreeId: null,
    selectWorktree: (id) => set({ selectedWorktreeId: id }),

    // Workspace View
    openWorktreeId: null,
    openWorktree: (id) => set({ openWorktreeId: id, selectedWorktreeId: id }),
    closeWorkspace: () => set({ openWorktreeId: null }),

    // Modals
    activeModal: null,
    modalData: {},
    openModal: (modal, data = {}) => set({ activeModal: modal, modalData: data }),
    closeModal: () => set({ activeModal: null, modalData: {} }),

    // Node positions
    nodePositions: {},
    setNodePosition: (id, position) =>
      set((state) => {
        state.nodePositions[id] = position;
      }),

    savePositions: () => {
      const { nodePositions } = get();
      saveToStorage(POSITIONS_STORAGE_KEY, nodePositions);
    },

    loadPositions: () => {
      const positions = loadFromStorage<Record<string, NodePosition>>(
        POSITIONS_STORAGE_KEY,
        {}
      );
      set({ nodePositions: positions });
    },

    // Layout mode
    autoLayout: true,
    toggleAutoLayout: () =>
      set((state) => {
        state.autoLayout = !state.autoLayout;
      }),
  }))
);

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

type ModalType = "fork" | "merge" | "delete" | null;
type PanelContent = "terminal" | "details" | null;

interface ModalData {
  baseBranch?: string;
  basePath?: string;
  worktreePath?: string;
  sourceBranch?: string;
  targetBranch?: string;
  sourceWorktreeId?: string; // ID of the worktree being forked from
}

interface NodePosition {
  x: number;
  y: number;
}

interface UIState {
  // Selection
  selectedWorktreeId: string | null;
  selectWorktree: (id: string | null) => void;

  // Panel
  isPanelOpen: boolean;
  panelContent: PanelContent;
  openPanel: (content: PanelContent) => void;
  closePanel: () => void;

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

    // Panel
    isPanelOpen: false,
    panelContent: null,
    openPanel: (content) => set({ isPanelOpen: true, panelContent: content }),
    closePanel: () => set({ isPanelOpen: false, panelContent: null }),

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
      try {
        localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(nodePositions));
      } catch {
        // Ignore storage errors
      }
    },

    loadPositions: () => {
      try {
        const stored = localStorage.getItem(POSITIONS_STORAGE_KEY);
        if (stored) {
          const positions = JSON.parse(stored);
          set({ nodePositions: positions });
        }
      } catch {
        // Ignore storage errors
      }
    },

    // Layout mode
    autoLayout: true,
    toggleAutoLayout: () =>
      set((state) => {
        state.autoLayout = !state.autoLayout;
      }),
  }))
);

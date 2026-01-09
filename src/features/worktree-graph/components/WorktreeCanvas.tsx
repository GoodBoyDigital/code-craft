import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type OnNodesChange,
  type NodeTypes,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useWorktreeStore, useUIStore } from "@/store";
import { useWorktreeLayout } from "../hooks/useWorktreeLayout";
import { WorktreeNode } from "./WorktreeNode";
import { ForkWorktreeModal } from "./ForkWorktreeModal";

// Register custom node types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: NodeTypes = {
  worktreeNode: WorktreeNode as any,
};

export function WorktreeCanvas() {
  const { worktrees, loading, error, fetchWorktrees } = useWorktreeStore();
  const {
    selectWorktree,
    activeModal,
    modalData,
    closeModal,
    setNodePosition,
    nodePositions,
    loadPositions,
    savePositions,
    autoLayout,
  } = useUIStore();

  const { getLayoutedElements } = useWorktreeLayout();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load saved positions on mount
  useEffect(() => {
    loadPositions();
  }, [loadPositions]);

  // Update layout when worktrees change
  useEffect(() => {
    if (worktrees.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const updateLayout = async () => {
      const { nodes: layoutedNodes, edges: layoutedEdges } =
        await getLayoutedElements(worktrees);

      // Apply saved positions if not using auto-layout
      const finalNodes = autoLayout
        ? layoutedNodes
        : layoutedNodes.map((node) => {
            const savedPosition = nodePositions[node.id];
            return savedPosition
              ? { ...node, position: savedPosition }
              : node;
          });

      setNodes(finalNodes);
      setEdges(layoutedEdges);
      setIsInitialized(true);
    };

    updateLayout();
  }, [
    worktrees,
    getLayoutedElements,
    setNodes,
    setEdges,
    autoLayout,
    nodePositions,
  ]);

  // Handle node position changes (for manual dragging)
  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);

      // Save position after drag ends
      changes.forEach((change) => {
        if (change.type === "position" && change.dragging === false && change.position) {
          setNodePosition(change.id, change.position);
          savePositions();
        }
      });
    },
    [onNodesChange, setNodePosition, savePositions]
  );

  // Handle node selection
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectWorktree(node.id);
    },
    [selectWorktree]
  );

  // Handle pane click (deselect)
  const handlePaneClick = useCallback(() => {
    selectWorktree(null);
  }, [selectWorktree]);

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-accent-danger text-sm">{error}</p>
          <button
            onClick={() => fetchWorktrees()}
            className="text-sm text-accent-primary hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (loading && !isInitialized) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-text-secondary text-sm">Loading worktrees...</div>
      </div>
    );
  }

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="rgba(255, 255, 255, 0.03)"
        />
        <Controls
          showInteractive={false}
          className="!bottom-4 !left-4"
        />
        <MiniMap
          nodeColor={(node) => {
            const worktree = (node.data as { worktree: { is_main: boolean } })
              ?.worktree;
            return worktree?.is_main ? "#22c55e" : "#6366f1";
          }}
          maskColor="rgba(0, 0, 0, 0.8)"
          className="!bottom-4 !right-4 !bg-bg-secondary !border !border-border-default !rounded-lg"
          style={{ width: 150, height: 100 }}
        />
      </ReactFlow>

      {/* Fork Modal */}
      <ForkWorktreeModal
        isOpen={activeModal === "fork"}
        onClose={closeModal}
        baseBranch={modalData.baseBranch}
      />
    </>
  );
}

import { useCallback, useMemo } from "react";
import ELK from "elkjs/lib/elk.bundled.js";
import type { Node, Edge } from "@xyflow/react";
import type { WorktreeNode } from "@/store/worktreeStore";

const elk = new ELK();

const NODE_WIDTH = 260;
const NODE_HEIGHT = 140;

const elkOptions = {
  "elk.algorithm": "layered",
  "elk.direction": "DOWN",
  "elk.layered.spacing.nodeNodeBetweenLayers": "80",
  "elk.spacing.nodeNode": "60",
  "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
  "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
};

interface UseWorktreeLayoutResult {
  getLayoutedElements: (
    worktrees: WorktreeNode[]
  ) => Promise<{ nodes: Node[]; edges: Edge[] }>;
}

export function useWorktreeLayout(): UseWorktreeLayoutResult {
  const getLayoutedElements = useCallback(
    async (worktrees: WorktreeNode[]): Promise<{ nodes: Node[]; edges: Edge[] }> => {
      if (worktrees.length === 0) {
        return { nodes: [], edges: [] };
      }

      // Create initial nodes and edges
      const initialNodes: Node[] = worktrees.map((wt) => ({
        id: wt.id,
        type: "worktreeNode",
        data: { worktree: wt },
        position: { x: 0, y: 0 },
      }));

      const initialEdges: Edge[] = worktrees
        .filter((wt) => wt.parentId)
        .map((wt) => ({
          id: `${wt.parentId}-${wt.id}`,
          source: wt.parentId!,
          target: wt.id,
          type: "smoothstep",
          animated: false,
          style: {
            stroke: "rgba(255, 255, 255, 0.1)",
            strokeWidth: 2,
          },
        }));

      // Build ELK graph structure
      const elkGraph = {
        id: "root",
        layoutOptions: elkOptions,
        children: initialNodes.map((node) => ({
          id: node.id,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
        })),
        edges: initialEdges.map((edge) => ({
          id: edge.id,
          sources: [edge.source],
          targets: [edge.target],
        })),
      };

      try {
        // Run ELK layout
        const layoutedGraph = await elk.layout(elkGraph);

        // Apply layout positions to nodes
        const layoutedNodes = initialNodes.map((node) => {
          const elkNode = layoutedGraph.children?.find((n) => n.id === node.id);
          return {
            ...node,
            position: {
              x: elkNode?.x ?? 0,
              y: elkNode?.y ?? 0,
            },
          };
        });

        return { nodes: layoutedNodes, edges: initialEdges };
      } catch (error) {
        console.error("ELK layout failed:", error);
        // Fallback: simple vertical layout
        const layoutedNodes = initialNodes.map((node, index) => ({
          ...node,
          position: {
            x: 0,
            y: index * (NODE_HEIGHT + 80),
          },
        }));
        return { nodes: layoutedNodes, edges: initialEdges };
      }
    },
    []
  );

  return useMemo(
    () => ({
      getLayoutedElements,
    }),
    [getLayoutedElements]
  );
}

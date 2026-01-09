import { useEffect } from "react";
import { useWorkspaceStore } from "@/store";
import { FileTreeItem } from "./FileTreeItem";

interface FileTreeProps {
  rootPath: string;
}

export function FileTree({ rootPath }: FileTreeProps) {
  const {
    fileTree,
    expandedDirs,
    selectedPath,
    loadingTree,
    loadFileTree,
    toggleDirectory,
    openFile,
  } = useWorkspaceStore();

  useEffect(() => {
    loadFileTree(rootPath);
  }, [rootPath, loadFileTree]);

  const handleSelect = (path: string) => {
    openFile(path);
  };

  if (loadingTree) {
    return (
      <div className="h-full flex flex-col bg-bg-secondary">
        <div className="px-3 py-2 text-xs font-medium text-text-secondary uppercase tracking-wide border-b border-border-subtle">
          Explorer
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-text-tertiary text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-bg-secondary">
      <div className="px-3 py-2 text-xs font-medium text-text-secondary uppercase tracking-wide border-b border-border-subtle">
        Explorer
      </div>
      <div className="flex-1 overflow-auto">
        {fileTree.length === 0 ? (
          <div className="px-3 py-4 text-text-tertiary text-sm">
            No files found
          </div>
        ) : (
          fileTree.map((node) => (
            <FileTreeItem
              key={node.path}
              node={node}
              depth={0}
              expanded={expandedDirs.has(node.path)}
              selected={selectedPath === node.path}
              onToggle={toggleDirectory}
              onSelect={handleSelect}
              expandedDirs={expandedDirs}
              selectedPath={selectedPath}
            />
          ))
        )}
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils";
import type { FileTreeNode } from "@/store";

interface FileTreeItemProps {
  node: FileTreeNode;
  depth: number;
  expanded: boolean;
  selected: boolean;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  expandedDirs: Set<string>;
  selectedPath: string | null;
}

// File type icon based on extension
function getFileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const iconMap: Record<string, string> = {
    ts: "text-blue-400",
    tsx: "text-blue-400",
    js: "text-yellow-400",
    jsx: "text-yellow-400",
    json: "text-yellow-300",
    md: "text-gray-400",
    css: "text-pink-400",
    scss: "text-pink-400",
    html: "text-orange-400",
    rs: "text-orange-500",
    py: "text-green-400",
    go: "text-cyan-400",
    yaml: "text-red-400",
    yml: "text-red-400",
    toml: "text-gray-400",
  };
  return iconMap[ext] || "text-text-tertiary";
}

export function FileTreeItem({
  node,
  depth,
  expanded,
  selected,
  onToggle,
  onSelect,
  expandedDirs,
  selectedPath,
}: FileTreeItemProps) {
  const isDirectory = node.type === "directory";
  const paddingLeft = 12 + depth * 16;

  const handleClick = () => {
    if (isDirectory) {
      onToggle(node.path);
    } else {
      onSelect(node.path);
    }
  };

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-1.5 py-1 px-2 cursor-pointer text-sm",
          "hover:bg-bg-hover transition-colors",
          selected && "bg-accent-primary/20 text-accent-primary"
        )}
        style={{ paddingLeft }}
        onClick={handleClick}
      >
        {isDirectory ? (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cn(
                "shrink-0 transition-transform",
                expanded && "rotate-90"
              )}
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 text-accent-warning"
            >
              <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
            </svg>
          </>
        ) : (
          <>
            <span className="w-3.5" /> {/* Spacer for alignment */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cn("shrink-0", getFileIcon(node.name))}
            >
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </>
        )}
        <span className="truncate">{node.name}</span>
      </div>

      {/* Render children if expanded */}
      {isDirectory && expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              expanded={expandedDirs.has(child.path)}
              selected={selectedPath === child.path}
              onToggle={onToggle}
              onSelect={onSelect}
              expandedDirs={expandedDirs}
              selectedPath={selectedPath}
            />
          ))}
        </div>
      )}
    </>
  );
}

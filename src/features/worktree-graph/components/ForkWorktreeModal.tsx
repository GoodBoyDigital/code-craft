import { useState, useCallback, useEffect, useMemo } from "react";
import { homeDir } from "@tauri-apps/api/path";
import { Modal, Button, Input } from "@/components/ui";
import { useWorktreeStore, useProjectStore } from "@/store";
import { isTauri } from "@/lib/environment";

interface ForkWorktreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseBranch?: string;
}

export function ForkWorktreeModal({
  isOpen,
  onClose,
  baseBranch = "HEAD",
}: ForkWorktreeModalProps) {
  const { createNewWorktree, loading, error, clearError } = useWorktreeStore();
  const { getActiveProject } = useProjectStore();

  const [branchName, setBranchName] = useState("");
  const [homePath, setHomePath] = useState<string>("~");
  const [validationError, setValidationError] = useState<string | null>(null);

  const activeProject = getActiveProject();
  const repoName = activeProject?.name || "repo";

  // Get home directory on mount
  useEffect(() => {
    if (isTauri) {
      homeDir().then(setHomePath).catch(() => setHomePath("~"));
    }
  }, []);

  // Sanitize branch name for use in path
  const sanitizedBranchName = useMemo(() => {
    return branchName
      .replace(/\//g, "-") // Replace slashes with hyphens
      .replace(/[^a-zA-Z0-9-_.]/g, "") // Remove invalid chars
      .toLowerCase();
  }, [branchName]);

  // Generate the worktree path
  const worktreePath = useMemo(() => {
    if (!sanitizedBranchName) return "";
    const base = homePath.endsWith("/") ? homePath.slice(0, -1) : homePath;
    return `${base}/code-craft/workspaces/${repoName}/${sanitizedBranchName}`;
  }, [homePath, repoName, sanitizedBranchName]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setBranchName("");
      setValidationError(null);
      clearError();
    }
  }, [isOpen, clearError]);

  const validateForm = useCallback(() => {
    if (!branchName.trim()) {
      setValidationError("Branch name is required");
      return false;
    }

    // Check for invalid characters in branch name
    if (!/^[\w\-./]+$/.test(branchName)) {
      setValidationError(
        "Branch name can only contain letters, numbers, hyphens, dots, and slashes"
      );
      return false;
    }

    setValidationError(null);
    return true;
  }, [branchName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await createNewWorktree(branchName, baseBranch, worktreePath);
      onClose();
    } catch {
      // Error is handled by the store
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Worktree">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-text-secondary">
          Create a new worktree and branch from{" "}
          <span className="font-mono text-accent-primary">
            {baseBranch || "HEAD"}
          </span>
        </p>

        <Input
          label="Branch Name"
          placeholder="feature/my-new-feature"
          value={branchName}
          onChange={(e) => setBranchName(e.target.value)}
          error={validationError || undefined}
          autoFocus
        />

        {/* Show generated path */}
        {worktreePath && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary">
              Worktree Location
            </label>
            <div className="px-3 py-2 rounded-lg bg-bg-elevated border border-border-subtle">
              <code className="text-xs text-text-tertiary font-mono break-all">
                {worktreePath}
              </code>
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-accent-danger bg-accent-danger/10 px-3 py-2 rounded">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading || !worktreePath}
          >
            {loading ? "Creating..." : "Create Worktree"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

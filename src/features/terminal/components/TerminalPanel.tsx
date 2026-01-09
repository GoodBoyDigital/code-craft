import { Panel } from "@/components/ui";
import { XTerminal } from "./XTerminal";

interface TerminalPanelProps {
  isOpen: boolean;
  onClose: () => void;
  worktreePath: string;
  title: string;
}

export function TerminalPanel({
  isOpen,
  onClose,
  worktreePath,
  title,
}: TerminalPanelProps) {
  return (
    <Panel
      isOpen={isOpen}
      onClose={onClose}
      title={`Terminal: ${title}`}
      width={500}
    >
      <XTerminal worktreePath={worktreePath} />
    </Panel>
  );
}

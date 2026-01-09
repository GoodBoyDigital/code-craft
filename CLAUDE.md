# CodeCraft - Visual Git Worktree Manager

## Project Overview

CodeCraft is a desktop application for visually managing Git worktrees. It provides a graph-based UI to create, navigate, and manage worktrees with integrated terminal and code editing.

**Tech Stack:**
- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Tauri 2 (Rust)
- **UI:** Tailwind CSS + Framer Motion
- **State:** Zustand with Immer
- **Graph:** React Flow (@xyflow/react)
- **Editor:** Monaco Editor
- **Terminal:** xterm.js + portable-pty

## Architecture

```
src/
├── components/          # Shared UI components
│   ├── layout/         # App layout (Sidebar)
│   └── ui/             # Primitives (Button, Input, Modal, Panel)
├── features/           # Feature modules (self-contained)
│   ├── workspace/      # IDE view (editor, terminal, file tree)
│   └── worktree-graph/ # Graph visualization
├── lib/                # Utilities and Tauri bindings
├── store/              # Zustand stores
└── styles/             # Global CSS

src-tauri/
├── src/
│   ├── commands/       # Tauri commands exposed to frontend
│   │   ├── filesystem.rs  # File read/write with security validation
│   │   ├── pty.rs         # Terminal PTY management
│   │   └── worktree.rs    # Git worktree operations
│   ├── lib.rs          # Plugin registration
│   └── main.rs         # Entry point
```

## Key Patterns

### State Management
- Each domain has its own Zustand store (`worktreeStore`, `uiStore`, `terminalStore`, etc.)
- Use Immer middleware for immutable updates
- Stores are in `src/store/` and re-exported from `src/store/index.ts`

### Tauri Commands
- All Tauri commands are wrapped in `src/lib/tauri.ts` with TypeScript types
- Commands use async/await pattern
- Error handling returns `Result<T, String>` from Rust

### Component Structure
- Features are self-contained in `src/features/<name>/`
- Each feature exports from an `index.ts` barrel file
- Shared components go in `src/components/ui/`

### Styling
- Use Tailwind CSS with custom theme tokens (see `tailwind.config.js`)
- Color tokens: `bg-primary`, `text-primary`, `accent-primary`, `border-default`, etc.
- Use `cn()` utility from `src/lib/utils.ts` for conditional classes

## Architecture Rules

### DO:
1. **Use stable IDs** - Worktree IDs must be derived from path (see `generateStableId`) to prevent race conditions
2. **Validate paths in Rust** - All filesystem operations must use `validate_path()` to prevent writes outside home directory
3. **Store parent relationships** - Branch parent relationships are stored in localStorage since git doesn't track this
4. **Support mock mode** - All Tauri-dependent code should have a browser fallback using `isTauri` check
5. **Clean up PTY sessions** - Always close PTY sessions when components unmount (except persistent Claude sessions)

### DON'T:
1. **Don't use random IDs for worktrees** - This breaks parent references on refetch
2. **Don't write to sensitive paths** - `.ssh`, `.aws`, `.gnupg`, `.kube`, `.docker` are blocked
3. **Don't hold locks during I/O** - Clone Arc handles before performing blocking operations
4. **Don't store child process handles without cleanup** - PTY sessions must have proper lifecycle management

### Security
- Filesystem operations are restricted to `$HOME` and `/tmp`
- Path traversal attacks are prevented via canonicalization
- Sensitive directories are explicitly blocked

## Common Tasks

### Adding a new Tauri command
1. Add the command in `src-tauri/src/commands/<module>.rs`
2. Register it in `src-tauri/src/lib.rs` under `invoke_handler`
3. Add TypeScript wrapper in `src/lib/tauri.ts`

### Adding a new store
1. Create `src/store/<name>Store.ts`
2. Export from `src/store/index.ts`
3. Use `create<State>()(immer((set, get) => ({...})))`

### Adding a new feature
1. Create `src/features/<name>/`
2. Add components in `src/features/<name>/components/`
3. Create `src/features/<name>/index.ts` barrel export

## Development

```bash
# Install dependencies
npm install

# Run in development (browser only, no Tauri)
npm run dev

# Run with Tauri (full app)
npm run tauri dev

# Build for production
npm run tauri build

# Type check
npm run build  # runs tsc && vite build
```

## Testing Worktrees

The app can be tested on its own repository:
```bash
# From the main repo
git worktree add ../codecraft-feature feature/my-feature
```

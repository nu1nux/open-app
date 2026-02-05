import { useEffect, useMemo, useRef, useState } from 'react';

type WorkspaceEntry = {
  id: string;
  name: string;
  path: string;
  lastOpenedAt: string;
};

type DiscoveredWorkspace = {
  name: string;
  path: string;
  lastModifiedAt: string;
};

type GitSummary = {
  available: boolean;
  reason?: string;
  root?: string;
  branch?: string;
  status?: string;
  lastCommit?: string;
};

type GitFileStatus = {
  path: string;
  staged: boolean;
  unstaged: boolean;
  status: string;
};

type GitFilesResult = {
  available: boolean;
  reason?: string;
  files: GitFileStatus[];
};

type DiffResult = {
  available: boolean;
  reason?: string;
  unstaged?: string;
  staged?: string;
};

type DirNode = {
  type: 'dir';
  name: string;
  path: string;
  children: TreeNode[];
};

type FileNode = {
  type: 'file';
  name: string;
  path: string;
  status: GitFileStatus;
};

type TreeNode = DirNode | FileNode;

type FlatNode = {
  node: TreeNode;
  depth: number;
};

type DiffLine = {
  type: 'add' | 'remove' | 'context' | 'hunk' | 'meta';
  oldLine: number | null;
  newLine: number | null;
  text: string;
  segments?: { text: string; highlight?: boolean }[];
};

type DiffFilter = 'all' | 'staged' | 'unstaged';

type TreeState = Record<string, boolean>;

type Selection = {
  type: 'file' | 'dir';
  path: string;
};

const modules = [
  'workspace',
  'git',
  'diff',
  'scripts',
  'testing',
  'spotlight',
  'todos',
  'checkpoints',
  'integrations',
  'providers',
  'storage',
  'ipc'
];

const TREE_STATE_KEY = 'openApp.treeState';
const ROW_HEIGHT = 40;
const OVERSCAN = 8;

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function pathName(path: string) {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

function buildTree(files: GitFileStatus[]): DirNode {
  const root: DirNode = { type: 'dir', name: 'root', path: '', children: [] };

  const findOrCreateDir = (parent: DirNode, name: string, path: string): DirNode => {
    const existing = parent.children.find(
      (child) => child.type === 'dir' && child.name === name
    ) as DirNode | undefined;
    if (existing) return existing;
    const next: DirNode = { type: 'dir', name, path, children: [] };
    parent.children.push(next);
    return next;
  };

  files.forEach((file) => {
    const parts = file.path.split('/');
    let current: DirNode = root;
    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;
      const nextPath = parts.slice(0, index + 1).join('/');
      if (isLast) {
        current.children.push({
          type: 'file',
          name: part,
          path: file.path,
          status: file
        });
      } else {
        current = findOrCreateDir(current, part, nextPath);
      }
    });
  });

  const sortTree = (node: TreeNode) => {
    if (node.type !== 'dir') return;
    node.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    node.children.forEach(sortTree);
  };

  sortTree(root);
  return root;
}

function flattenTree(node: TreeNode, treeState: TreeState, depth = 0, list: FlatNode[] = []) {
  if (node.type === 'file') {
    list.push({ node, depth });
    return list;
  }

  if (node.path !== '') {
    list.push({ node, depth });
    if (!(treeState[node.path] ?? true)) {
      return list;
    }
  }

  node.children.forEach((child) => flattenTree(child, treeState, node.path === '' ? depth : depth + 1, list));
  return list;
}

function parseDiff(diffText: string): DiffLine[] {
  const lines = diffText.split('\n');
  const result: DiffLine[] = [];
  let oldLine = 0;
  let newLine = 0;

  lines.forEach((line) => {
    if (line.startsWith('@@')) {
      const match = /@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
      if (match) {
        oldLine = Number(match[1]);
        newLine = Number(match[2]);
      }
      result.push({ type: 'hunk', oldLine: null, newLine: null, text: line });
      return;
    }

    if (line.startsWith('diff ') || line.startsWith('index ') || line.startsWith('+++') || line.startsWith('---')) {
      result.push({ type: 'meta', oldLine: null, newLine: null, text: line });
      return;
    }

    if (line.startsWith('+')) {
      if (!line.startsWith('+++')) {
        result.push({ type: 'add', oldLine: null, newLine: newLine++, text: line });
        return;
      }
    }

    if (line.startsWith('-')) {
      if (!line.startsWith('---')) {
        result.push({ type: 'remove', oldLine: oldLine++, newLine: null, text: line });
        return;
      }
    }

    result.push({ type: 'context', oldLine: oldLine++, newLine: newLine++, text: line });
  });

  return applyInlineHighlights(result);
}

function applyInlineHighlights(lines: DiffLine[]) {
  const output = [...lines];
  let index = 0;

  while (index < output.length) {
    if (output[index].type === 'remove') {
      const removeLines: DiffLine[] = [];
      while (index < output.length && output[index].type === 'remove') {
        removeLines.push(output[index]);
        index += 1;
      }

      const addLines: DiffLine[] = [];
      while (index < output.length && output[index].type === 'add') {
        addLines.push(output[index]);
        index += 1;
      }

      const pairCount = Math.min(removeLines.length, addLines.length);
      for (let i = 0; i < pairCount; i += 1) {
        const removeLine = removeLines[i];
        const addLine = addLines[i];
        const removeContent = removeLine.text.slice(1);
        const addContent = addLine.text.slice(1);
        const { start: removeStartIndex, end: removeEndIndex, startNew, endNew } = diffRange(
          removeContent,
          addContent
        );
        removeLine.segments = buildSegments('-', removeContent, removeStartIndex, removeEndIndex);
        addLine.segments = buildSegments('+', addContent, startNew, endNew);
      }

      if (addLines.length === 0 && removeLines.length > 0) {
        removeLines[0].segments = buildSegments('-', removeLines[0].text.slice(1));
      }

      if (removeLines.length === 0 && addLines.length > 0) {
        addLines[0].segments = buildSegments('+', addLines[0].text.slice(1));
      }

      continue;
    }

    index += 1;
  }

  return output;
}

function diffRange(oldText: string, newText: string) {
  const minLen = Math.min(oldText.length, newText.length);
  let prefix = 0;
  while (prefix < minLen && oldText[prefix] === newText[prefix]) {
    prefix += 1;
  }

  let suffix = 0;
  while (
    suffix < minLen - prefix &&
    oldText[oldText.length - 1 - suffix] === newText[newText.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  const oldStart = prefix;
  const oldEnd = Math.max(prefix, oldText.length - suffix);
  const newStart = prefix;
  const newEnd = Math.max(prefix, newText.length - suffix);

  return {
    start: oldStart,
    end: oldEnd,
    startNew: newStart,
    endNew: newEnd
  };
}

function buildSegments(prefix: string, content: string, start?: number, end?: number) {
  if (start === undefined || end === undefined || end <= start) {
    return [{ text: `${prefix}${content}` }];
  }

  const pre = content.slice(0, start);
  const mid = content.slice(start, end);
  const post = content.slice(end);

  return [
    { text: `${prefix}${pre}` },
    { text: mid, highlight: true },
    { text: post }
  ];
}

function DiffView({ diff, onlyChanges }: { diff?: string; onlyChanges?: boolean }) {
  const [copiedChunk, setCopiedChunk] = useState<string | null>(null);

  if (!diff) {
    return <p className="muted">No diff.</p>;
  }

  if (diff.startsWith('git diff failed')) {
    return <pre>{diff}</pre>;
  }

  if (diff === '(no changes)') {
    return <p className="muted">No changes.</p>;
  }

  const lines = parseDiff(diff);
  const chunks: DiffLine[][] = [];
  let current: DiffLine[] = [];

  lines.forEach((line) => {
    if (line.type === 'hunk' && current.length > 0) {
      chunks.push(current);
      current = [line];
      return;
    }
    current.push(line);
  });

  if (current.length > 0) {
    chunks.push(current);
  }

  const filteredChunks = chunks
    .map((chunk) =>
      onlyChanges ? chunk.filter((line) => line.type === 'add' || line.type === 'remove' || line.type === 'hunk') : chunk
    )
    .filter((chunk) => {
      if (!onlyChanges) return true;
      return chunk.some((line) => line.type === 'add' || line.type === 'remove');
    });

  const copyChunk = async (chunk: DiffLine[], id: string) => {
    const text = chunk.map((line) => line.text).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedChunk(id);
      window.setTimeout(() => setCopiedChunk(null), 1200);
    } catch {
      setCopiedChunk(null);
    }
  };

  return (
    <div className="diff-view">
      {filteredChunks.map((chunk, index) => {
        const id = `chunk-${index}`;
        return (
          <div key={id} className="diff-chunk">
            <div className="chunk-header">
              <span className="chunk-title">{chunk.find((line) => line.type === 'hunk')?.text ?? 'Chunk'}</span>
              <button className="chip" onClick={() => copyChunk(chunk, id)}>
                {copiedChunk === id ? 'Copied' : 'Copy chunk'}
              </button>
            </div>
            {chunk.map((line, lineIndex) => (
              <div key={`${id}-${lineIndex}`} className={`diff-line ${line.type}`}>
                <span className="line-no">{line.oldLine ?? ''}</span>
                <span className="line-no">{line.newLine ?? ''}</span>
                <span className="diff-text">
                  {line.segments
                    ? line.segments.map((segment, segIndex) => (
                        <span
                          key={`${id}-${lineIndex}-${segIndex}`}
                          className={segment.highlight ? 'diff-seg highlight' : 'diff-seg'}
                        >
                          {segment.text}
                        </span>
                      ))
                    : line.text}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function TreeRow({
  item,
  onSelect,
  selected,
  treeState,
  onToggle
}: {
  item: FlatNode;
  onSelect: (path: string) => void;
  selected: Selection | null;
  treeState: TreeState;
  onToggle: (path: string) => void;
}) {
  const { node, depth } = item;
  const paddingStyle = { paddingLeft: `${depth * 14}px` };
  const isSelected = selected?.path === node.path && selected?.type === node.type;

  if (node.type === 'file') {
    const status = node.status;
    return (
      <button
        className={isSelected ? 'file-button active' : 'file-button'}
        style={paddingStyle}
        onClick={() => onSelect(node.path)}
      >
        <span className="file-name">{node.path}</span>
        <span className="tags">
          {status.staged && <span className="tag">staged</span>}
          {status.unstaged && <span className="tag">unstaged</span>}
          <span className="tag code">{status.status}</span>
        </span>
      </button>
    );
  }

  const isOpen = treeState[node.path] ?? true;

  return (
    <button
      className={isSelected ? 'tree-toggle active' : 'tree-toggle'}
      style={paddingStyle}
      onClick={() => onToggle(node.path)}
    >
      <span className="caret">{isOpen ? 'v' : '>'}</span>
      <span>{node.name}</span>
    </button>
  );
}

export default function App() {
  const [ping, setPing] = useState('');
  const [workspaces, setWorkspaces] = useState<WorkspaceEntry[]>([]);
  const [recentWorkspaces, setRecentWorkspaces] = useState<WorkspaceEntry[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceEntry | null>(null);
  const [gitSummary, setGitSummary] = useState<GitSummary | null>(null);
  const [gitFiles, setGitFiles] = useState<GitFilesResult | null>(null);
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileDiff, setFileDiff] = useState<DiffResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered] = useState<DiscoveredWorkspace[]>([]);
  const [ignoredPaths, setIgnoredPaths] = useState<string[]>([]);
  const [diffFilter, setDiffFilter] = useState<DiffFilter>('all');
  const [onlyChanges, setOnlyChanges] = useState(false);
  const [fileQuery, setFileQuery] = useState('');
  const [scanRoots, setScanRoots] = useState('');
  const [treeState, setTreeState] = useState<TreeState>(() => {
    try {
      const raw = window.localStorage.getItem(TREE_STATE_KEY);
      return raw ? (JSON.parse(raw) as TreeState) : {};
    } catch {
      return {};
    }
  });
  const [selection, setSelection] = useState<Selection | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(360);
  const refreshTimer = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const filteredFiles = useMemo(() => {
    if (!gitFiles?.available) return [];
    const query = fileQuery.trim().toLowerCase();
    return gitFiles.files.filter((file) => {
      if (diffFilter === 'staged' && !file.staged) return false;
      if (diffFilter === 'unstaged' && !file.unstaged) return false;
      if (!query) return true;
      return file.path.toLowerCase().includes(query);
    });
  }, [gitFiles, diffFilter, fileQuery]);

  const treeRoot = useMemo(() => {
    if (!gitFiles?.available) return null;
    return buildTree(filteredFiles);
  }, [gitFiles, filteredFiles]);

  const flatNodes = useMemo(() => {
    if (!treeRoot) return [];
    return flattenTree(treeRoot, treeState);
  }, [treeRoot, treeState]);

  const virtual = useMemo(() => {
    const total = flatNodes.length;
    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const end = Math.min(total, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN);
    return {
      start,
      end,
      total,
      items: flatNodes.slice(start, end),
      offset: start * ROW_HEIGHT,
      totalHeight: total * ROW_HEIGHT
    };
  }, [flatNodes, scrollTop, viewportHeight]);

  const refresh = async () => {
    setLoading(true);
    try {
      const [list, recent, current, summary, diffResult, files, ignored] = await Promise.all([
        window.openApp.workspace.list(),
        window.openApp.workspace.recent(5),
        window.openApp.workspace.current(),
        window.openApp.git.summary(),
        window.openApp.diff.current(),
        window.openApp.git.files(),
        window.openApp.workspace.ignored.list()
      ]);

      setWorkspaces(list);
      setRecentWorkspaces(recent);
      setCurrentWorkspace(current);
      setGitSummary(summary);
      setDiff(diffResult);
      setGitFiles(files);
      setIgnoredPaths(ignored);

      if (selectedFile) {
        const stillExists = files.available && files.files.some((file) => file.path === selectedFile);
        if (!stillExists) {
          setSelectedFile(null);
          setFileDiff(null);
        } else {
          const nextDiff = await window.openApp.diff.file(selectedFile);
          setFileDiff(nextDiff);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const scheduleRefresh = () => {
    if (refreshTimer.current) return;
    refreshTimer.current = window.setTimeout(() => {
      refreshTimer.current = null;
      refresh();
    }, 200);
  };

  const pickWorkspace = async () => {
    await window.openApp.workspace.pick();
    await refresh();
  };

  const setWorkspace = async (id: string) => {
    await window.openApp.workspace.set(id);
    await refresh();
  };

  const renameWorkspace = async (entry: WorkspaceEntry) => {
    const name = window.prompt('Rename workspace', entry.name);
    if (!name || name.trim() === entry.name) return;
    await window.openApp.workspace.rename(entry.id, name.trim());
    await refresh();
  };

  const removeWorkspace = async (entry: WorkspaceEntry) => {
    const ok = window.confirm(`Remove workspace ${entry.name}?`);
    if (!ok) return;
    await window.openApp.workspace.remove(entry.id);
    await refresh();
  };

  const selectFile = async (filePath: string) => {
    setSelectedFile(filePath);
    setSelection({ type: 'file', path: filePath });
    const result = await window.openApp.diff.file(filePath);
    setFileDiff(result);

    const parts = filePath.split('/');
    const nextTreeState = { ...treeState };
    parts.reduce((acc, part, index) => {
      const next = acc ? `${acc}/${part}` : part;
      if (index < parts.length - 1) {
        nextTreeState[next] = true;
      }
      return next;
    }, '');
    setTreeState(nextTreeState);
    window.localStorage.setItem(TREE_STATE_KEY, JSON.stringify(nextTreeState));
  };

  const ignoreDiscovered = async (entry: DiscoveredWorkspace) => {
    const next = await window.openApp.workspace.ignored.add(entry.path);
    setIgnoredPaths(next);
    setDiscovered((prev) => prev.filter((item) => item.path !== entry.path));
  };

  const restoreIgnored = async (path: string) => {
    const next = await window.openApp.workspace.ignored.remove(path);
    setIgnoredPaths(next);
    setDiscovered((prev) => {
      if (prev.some((item) => item.path === path)) return prev;
      const match = lastScanRef.current.find((entry) => entry.path === path);
      return match ? [match, ...prev] : prev;
    });
  };

  const runDiscovery = async () => {
    setDiscovering(true);
    try {
      const roots = scanRoots
        .split(/[,\n]/)
        .map((entry) => entry.trim())
        .filter(Boolean);
      const result = await window.openApp.workspace.discover(
        roots.length > 0 ? { roots, maxDepth: 4, limit: 50 } : { maxDepth: 4, limit: 50 }
      );
      lastScanRef.current = result;
      setDiscovered(result);
    } finally {
      setDiscovering(false);
    }
  };

  const addDiscovered = async (entry: DiscoveredWorkspace) => {
    await window.openApp.workspace.add(entry.path);
    await refresh();
  };

  const toggleTree = (path: string) => {
    const next = { ...treeState, [path]: !(treeState[path] ?? true) };
    setTreeState(next);
    window.localStorage.setItem(TREE_STATE_KEY, JSON.stringify(next));
  };

  const clearQuery = () => setFileQuery('');

  const lastScanRef = useRef<DiscoveredWorkspace[]>([]);

  const moveSelection = (direction: 1 | -1) => {
    if (flatNodes.length === 0) return;

    const currentIndex = selection
      ? flatNodes.findIndex((item) => item.node.path === selection.path && item.node.type === selection.type)
      : -1;

    let nextIndex = currentIndex + direction;
    if (currentIndex === -1) {
      nextIndex = direction > 0 ? 0 : flatNodes.length - 1;
    }

    while (nextIndex >= 0 && nextIndex < flatNodes.length) {
      const candidate = flatNodes[nextIndex].node;
      if (candidate.type === 'file') {
        selectFile(candidate.path);
        scrollToIndex(nextIndex);
        return;
      }
      if (candidate.type === 'dir') {
        setSelection({ type: 'dir', path: candidate.path });
        scrollToIndex(nextIndex);
        return;
      }
      nextIndex += direction;
    }
  };

  const scrollToIndex = (index: number) => {
    const element = listRef.current;
    if (!element) return;
    const top = index * ROW_HEIGHT;
    const bottom = top + ROW_HEIGHT;
    if (top < element.scrollTop) {
      element.scrollTop = top;
    } else if (bottom > element.scrollTop + element.clientHeight) {
      element.scrollTop = bottom - element.clientHeight;
    }
  };

  const handleTreeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveSelection(1);
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveSelection(-1);
    }
    if (event.key === 'ArrowRight') {
      if (selection?.type === 'dir') {
        toggleTree(selection.path);
      }
    }
    if (event.key === 'ArrowLeft') {
      if (selection?.type === 'dir') {
        toggleTree(selection.path);
      }
    }
    if (event.key === 'Enter') {
      if (selection?.type === 'file') {
        selectFile(selection.path);
      }
    }
  };

  useEffect(() => {
    let mounted = true;
    window.openApp
      .ping()
      .then((value) => {
        if (mounted) setPing(value);
      })
      .catch(() => {
        if (mounted) setPing('ping failed');
      });

    refresh();

    const offWorkspace = window.openApp.events.on('workspace:changed', scheduleRefresh);
    const offGit = window.openApp.events.on('git:changed', scheduleRefresh);
    const offDiff = window.openApp.events.on('diff:changed', scheduleRefresh);

    return () => {
      mounted = false;
      offWorkspace();
      offGit();
      offDiff();
      if (refreshTimer.current) {
        window.clearTimeout(refreshTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    const element = listRef.current;
    if (!element) return;

    const updateSize = () => {
      setViewportHeight(element.clientHeight || 360);
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div className="app">
      <header>
        <h1>Open App</h1>
        <p>Electron + React + TypeScript</p>
      </header>

      <section className="card">
        <div className="card-header">
          <h2>Workspace</h2>
          <div className="actions">
            <button onClick={pickWorkspace}>Pick workspace</button>
            <button onClick={runDiscovery} disabled={discovering}>
              {discovering ? 'Scanning...' : 'Scan git repos'}
            </button>
            <button onClick={refresh} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
        <p className="muted">
          Current: {currentWorkspace ? currentWorkspace.path : 'None selected'}
        </p>
        <div className="grid-two">
          <div>
            <h3>Recent</h3>
            {recentWorkspaces.length === 0 ? (
              <p className="muted">No recent workspaces.</p>
            ) : (
              <ul className="workspace-list">
                {recentWorkspaces.map((entry) => (
                  <li key={entry.id}>
                    <div>
                      <strong>{entry.name}</strong>
                      <span>{entry.path}</span>
                      <span className="meta">Last opened: {formatDate(entry.lastOpenedAt)}</span>
                    </div>
                    <div className="row-actions">
                      <button onClick={() => setWorkspace(entry.id)}>Set current</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3>All workspaces</h3>
            {workspaces.length === 0 ? (
              <p className="muted">No workspaces yet.</p>
            ) : (
              <ul className="workspace-list">
                {workspaces.map((entry) => (
                  <li key={entry.id}>
                    <div>
                      <strong>{entry.name}</strong>
                      <span>{entry.path}</span>
                      <span className="meta">Last opened: {formatDate(entry.lastOpenedAt)}</span>
                    </div>
                    <div className="row-actions">
                      <button onClick={() => setWorkspace(entry.id)}>Set current</button>
                      <button className="secondary" onClick={() => renameWorkspace(entry)}>
                        Rename
                      </button>
                      <button className="danger" onClick={() => removeWorkspace(entry)}>
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="discovery">
          <h3>Discovered git repositories</h3>
          <div className="discovery-controls">
            <input
              className="text-input"
              value={scanRoots}
              onChange={(event) => setScanRoots(event.target.value)}
              placeholder="Optional: custom roots (comma or newline separated)"
            />
            <button className="secondary" onClick={() => setScanRoots('')}>
              Clear roots
            </button>
          </div>
          {discovered.length === 0 ? (
            <p className="muted">Run scan to find git repositories under your home folders.</p>
          ) : (
            <ul className="workspace-list">
              {discovered.map((entry) => (
                <li key={entry.path}>
                  <div>
                    <strong>{entry.name}</strong>
                    <span>{entry.path}</span>
                    <span className="meta">Modified: {formatDate(entry.lastModifiedAt)}</span>
                  </div>
                  <div className="row-actions">
                    <button onClick={() => addDiscovered(entry)}>Add</button>
                    <button className="secondary" onClick={() => ignoreDiscovered(entry)}>
                      Ignore
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="ignored">
            <h4>Ignored repos</h4>
            {ignoredPaths.length === 0 ? (
              <p className="muted">No ignored repositories.</p>
            ) : (
              <ul className="workspace-list">
                {ignoredPaths.map((path) => (
                  <li key={path}>
                    <div>
                      <strong>{pathName(path)}</strong>
                      <span>{path}</span>
                    </div>
                    <div className="row-actions">
                      <button className="secondary" onClick={() => restoreIgnored(path)}>
                        Restore
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Git summary</h2>
        {gitSummary?.available ? (
          <div className="stack">
            <p>
              <strong>Branch:</strong> {gitSummary.branch ?? 'unknown'}
            </p>
            <p>
              <strong>Last commit:</strong> {gitSummary.lastCommit ?? 'unknown'}
            </p>
            <pre>{gitSummary.status ?? ''}</pre>
          </div>
        ) : (
          <p className="muted">{gitSummary?.reason ?? 'Loading...'}</p>
        )}
      </section>

      <section className="card">
        <div className="card-header">
          <h2>File changes</h2>
          <div className="actions">
            <button
              className={diffFilter === 'all' ? 'active' : ''}
              onClick={() => setDiffFilter('all')}
            >
              All
            </button>
            <button
              className={diffFilter === 'staged' ? 'active' : ''}
              onClick={() => setDiffFilter('staged')}
            >
              Staged
            </button>
            <button
              className={diffFilter === 'unstaged' ? 'active' : ''}
              onClick={() => setDiffFilter('unstaged')}
            >
              Unstaged
            </button>
            <button
              className={onlyChanges ? 'active' : ''}
              onClick={() => setOnlyChanges((prev) => !prev)}
            >
              Only changes
            </button>
            <button onClick={() => refresh()} disabled={loading}>
              Refresh files
            </button>
          </div>
        </div>
        <div className="file-toolbar">
          <input
            className="text-input"
            placeholder="Find file..."
            value={fileQuery}
            onChange={(event) => setFileQuery(event.target.value)}
          />
          <button className="secondary" onClick={clearQuery}>
            Clear
          </button>
        </div>
        {gitFiles?.available ? (
          filteredFiles.length === 0 ? (
            <p className="muted">No file changes.</p>
          ) : (
            <div className="grid-two">
              <div className="tree-panel">
                <div
                  className="tree-virtual"
                  ref={listRef}
                  onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
                  onKeyDown={handleTreeKeyDown}
                  tabIndex={0}
                >
                  <div className="tree-spacer" style={{ height: `${virtual.totalHeight}px` }}>
                    <div className="tree-rows" style={{ transform: `translateY(${virtual.offset}px)` }}>
                      {virtual.items.map((item, index) => (
                        <TreeRow
                          key={`${item.node.type}-${item.node.path}-${index}`}
                          item={item}
                          onSelect={selectFile}
                          selected={selection}
                          treeState={treeState}
                          onToggle={toggleTree}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="diff-panel">
                <h3>{selectedFile ? `Diff: ${selectedFile}` : 'Select a file'}</h3>
                {selectedFile && fileDiff?.available ? (
                  <div className="stack">
                    {(diffFilter === 'all' || diffFilter === 'unstaged') && (
                      <div>
                        <h4>Unstaged</h4>
                        <DiffView diff={fileDiff.unstaged} onlyChanges={onlyChanges} />
                      </div>
                    )}
                    {(diffFilter === 'all' || diffFilter === 'staged') && (
                      <div>
                        <h4>Staged</h4>
                        <DiffView diff={fileDiff.staged} onlyChanges={onlyChanges} />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="muted">Pick a file to see its diff.</p>
                )}
              </div>
            </div>
          )
        ) : (
          <p className="muted">{gitFiles?.reason ?? 'Loading...'}</p>
        )}
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Workspace diff (all files)</h2>
          <div className="actions">
            <button
              className={diffFilter === 'all' ? 'active' : ''}
              onClick={() => setDiffFilter('all')}
            >
              All
            </button>
            <button
              className={diffFilter === 'staged' ? 'active' : ''}
              onClick={() => setDiffFilter('staged')}
            >
              Staged
            </button>
            <button
              className={diffFilter === 'unstaged' ? 'active' : ''}
              onClick={() => setDiffFilter('unstaged')}
            >
              Unstaged
            </button>
            <button
              className={onlyChanges ? 'active' : ''}
              onClick={() => setOnlyChanges((prev) => !prev)}
            >
              Only changes
            </button>
          </div>
        </div>
        {diff?.available ? (
          <div className="stack">
            {(diffFilter === 'all' || diffFilter === 'unstaged') && (
              <div>
                <h3>Unstaged</h3>
                <DiffView diff={diff.unstaged} onlyChanges={onlyChanges} />
              </div>
            )}
            {(diffFilter === 'all' || diffFilter === 'staged') && (
              <div>
                <h3>Staged</h3>
                <DiffView diff={diff.staged} onlyChanges={onlyChanges} />
              </div>
            )}
          </div>
        ) : (
          <p className="muted">{diff?.reason ?? 'Loading...'}</p>
        )}
      </section>

      <section className="card">
        <h2>IPC check</h2>
        <p>{ping ? ping : 'waiting for main process...'}</p>
      </section>

      <section className="card">
        <h2>Main modules</h2>
        <ul>
          {modules.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

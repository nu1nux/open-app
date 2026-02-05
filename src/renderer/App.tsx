/**
 * @fileoverview Main application component for the desktop UI.
 * Renders the sidebar, navigation, thread list, and main content area.
 * @module renderer/App
 */

import { useState, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useWorkspaceStore, useGitStore, useThreadStore } from './stores';
import { useInitApp } from './hooks/useInitApp';
import { WelcomePage, FileList, SplashScreen } from './components';
import {
  NewThreadIcon,
  AutomationsIcon,
  SkillsIcon,
  PlusIcon,
  FilterIcon,
  FolderIcon,
  SettingsIcon,
  ChevronDownIcon,
  UndoIcon,
  ListIcon,
  WindowIcon,
  ShareIcon,
  GamepadIcon,
  MagicWandIcon,
  DocumentIcon,
  AttachIcon,
  MicrophoneIcon,
  SendIcon
} from './icons';

/**
 * Navigation item configuration.
 */
type NavItem = {
  id: string;
  label: string;
  icon: ReactNode;
};

/** Navigation items for the sidebar */
const navItems: NavItem[] = [
  { id: 'new-thread', label: 'New thread', icon: <NewThreadIcon /> },
  { id: 'automations', label: 'Automations', icon: <AutomationsIcon /> },
  { id: 'skills', label: 'Skills', icon: <SkillsIcon /> }
];

/** Suggestion cards displayed in the hero section */
const suggestionCards = [
  { id: 'card-1', icon: <GamepadIcon />, title: 'Build a classic Snake\ngame in this repo.' },
  { id: 'card-2', icon: <MagicWandIcon />, title: 'Create a one-page\n$pdf that summarizes\nthis app.' },
  { id: 'card-3', icon: <DocumentIcon />, title: "Summarize last week's\nPRs by teammate and\ntheme." }
];

/**
 * Formats a timestamp into a relative time string.
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Relative time string (e.g., "5m", "2h", "3d")
 */
function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

/**
 * Main application component.
 * Renders the complete desktop application UI including sidebar,
 * navigation, thread list, hero section, and right panel.
 * @returns {JSX.Element} The rendered application
 */
export default function App() {
  useInitApp();

  const { current: workspace, list: workspaces } = useWorkspaceStore();
  const { summary: gitSummary, files: gitFiles } = useGitStore();
  const { threads, activeId: activeThread, setActive: setActiveThread, createThread } = useThreadStore();

  const [showSplash, setShowSplash] = useState(true);
  const [activeNav, setActiveNav] = useState('new-thread');
  const [changesView, setChangesView] = useState<'unstaged' | 'staged'>('staged');
  const [composerValue, setComposerValue] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 700);
    return () => clearTimeout(timer);
  }, []);

  const stagedFiles = useMemo(
    () => gitFiles.filter((f) => f.staged),
    [gitFiles]
  );
  const unstagedFiles = useMemo(
    () => gitFiles.filter((f) => f.unstaged),
    [gitFiles]
  );

  const currentFiles = changesView === 'staged' ? stagedFiles : unstagedFiles;
  const emptyTitle = changesView === 'staged' ? 'No staged changes' : 'No unstaged changes';
  const emptySubtitle =
    changesView === 'staged' ? 'Accept edits to stage them' : 'Working tree is clean';

  if (showSplash) {
    return <SplashScreen />;
  }

  if (!workspace) {
    return <WelcomePage recentWorkspaces={workspaces} />;
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <button
                key={item.id}
                className={activeNav === item.id ? 'nav-item active' : 'nav-item'}
                onClick={() => {
                  setActiveNav(item.id);
                  if (item.id === 'new-thread' && workspace) {
                    createThread(workspace.id, 'New thread');
                  }
                }}
                type="button"
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="sidebar-section">
            <div className="section-header">
              <span className="section-title">Threads</span>
              <div className="section-actions">
                <button className="icon-button" type="button" aria-label="Create thread">
                  <PlusIcon />
                </button>
                <button className="icon-button" type="button" aria-label="Filter threads">
                  <FilterIcon />
                </button>
              </div>
            </div>

            <div className="thread-group">
              <div className="group-title">
                <span className="group-icon">
                  <FolderIcon />
                </span>
                <span>{workspace.name}</span>
              </div>
              {threads.length === 0 ? (
                <div className="group-empty">No threads</div>
              ) : (
                <div className="thread-list">
                  {threads.map((thread) => (
                    <button
                      key={thread.id}
                      className={activeThread === thread.id ? 'thread-item active' : 'thread-item'}
                      onClick={() => setActiveThread(thread.id)}
                      type="button"
                    >
                      <span className="thread-title">{thread.title}</span>
                      <span className="thread-time">
                        {formatRelativeTime(thread.updatedAt)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="sidebar-bottom">
          <button className="nav-item" type="button">
            <span className="nav-icon">
              <SettingsIcon />
            </span>
            <span>Settings</span>
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left" />
          <button className="topbar-center" type="button">
            Uncommitted changes
            <ChevronDownIcon />
          </button>
          <div className="topbar-actions">
            <button className="pill-button" type="button">
              <span className="pill-icon">
                <UndoIcon />
              </span>
              Open
              <ChevronDownIcon />
            </button>
            <button className="pill-button" type="button">
              <span className="pill-icon">
                <ListIcon />
              </span>
              Commit
              <ChevronDownIcon />
            </button>
            <button className="icon-button" type="button" aria-label="View mode">
              <WindowIcon />
            </button>
            <button className="icon-button" type="button" aria-label="Share">
              <ShareIcon />
            </button>
          </div>
        </header>

        <div className="content">
          <section className="center-panel">
            <div className="hero-block">
              <div className="hero-icon">
                <span className="hero-dot" />
              </div>
              <h1 className="hero-title">Let&apos;s build</h1>
              <button className="hero-subtitle" type="button">
                open-app
                <ChevronDownIcon />
              </button>
            </div>

            <div className="suggestions">
              <span className="suggestions-label">Explore more</span>
              <div className="suggestions-grid">
                {suggestionCards.map((card) => (
                  <button key={card.id} className="suggestion-card" type="button">
                    <span className="suggestion-icon">{card.icon}</span>
                    <span className="suggestion-text">{card.title}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="composer">
              <div className="composer-input">
                <input
                  placeholder="Ask Codex anything, @ to add files, / for commands"
                  value={composerValue}
                  onChange={(event) => setComposerValue(event.target.value)}
                />
                <div className="composer-icons">
                  <button className="icon-button" type="button" aria-label="Attach">
                    <AttachIcon />
                  </button>
                  <button className="icon-button" type="button" aria-label="Voice">
                    <MicrophoneIcon />
                  </button>
                </div>
              </div>
              <div className="composer-controls">
                <div className="composer-left">
                  <button className="plus-button" type="button" aria-label="Add">
                    <PlusIcon />
                  </button>
                  <button className="model-button" type="button">
                    GPT-5.2-Codex High
                    <ChevronDownIcon />
                  </button>
                </div>
                <button className="send-button" type="button" aria-label="Send">
                  <SendIcon />
                </button>
              </div>
              <div className="status-bar">
                <div className="status-left">
                  <span className="status-chip active">Local</span>
                  <span className="status-chip">Worktree</span>
                </div>
                <div className="status-right">
                  <span className="status-dot" />
                  <span>{gitSummary?.branch ?? 'main'}</span>
                </div>
              </div>
            </div>
          </section>

          <aside className="right-panel">
            <div className="panel-tabs">
              <button
                className={changesView === 'unstaged' ? 'panel-tab active' : 'panel-tab'}
                onClick={() => setChangesView('unstaged')}
                type="button"
              >
                Unstaged ({unstagedFiles.length})
              </button>
              <button
                className={changesView === 'staged' ? 'panel-tab active' : 'panel-tab'}
                onClick={() => setChangesView('staged')}
                type="button"
              >
                Staged ({stagedFiles.length})
              </button>
            </div>
            {currentFiles.length === 0 ? (
              <div className="panel-empty">
                <p className="panel-empty-title">{emptyTitle}</p>
                <p className="panel-empty-subtitle">{emptySubtitle}</p>
              </div>
            ) : (
              <FileList files={currentFiles} />
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

/**
 * @fileoverview Main application component for the desktop UI.
 * Renders the sidebar, navigation, thread list, and main content area.
 * @module renderer/App
 */

import { useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Navigation item configuration.
 */
type NavItem = {
  id: string;
  label: string;
  icon: ReactNode;
};

/**
 * Thread item configuration for the sidebar thread list.
 */
type ThreadItem = {
  id: string;
  title: string;
  time?: string;
};

/**
 * Thread group configuration containing multiple thread items.
 */
type ThreadGroup = {
  id: string;
  name: string;
  items: ThreadItem[];
};

/** Navigation items for the sidebar */
const navItems: NavItem[] = [
  {
    id: 'new-thread',
    label: 'New thread',
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M10 4v12M4 10h12" />
        <rect x="3" y="3" width="14" height="14" rx="4" />
      </svg>
    )
  },
  {
    id: 'automations',
    label: 'Automations',
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M10 4v3" />
        <path d="M10 13v3" />
        <path d="M4 10h3" />
        <path d="M13 10h3" />
        <circle cx="10" cy="10" r="4.5" />
      </svg>
    )
  },
  {
    id: 'skills',
    label: 'Skills',
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M6 4h8l2 3-6 9-6-9z" />
        <path d="M6 4l4 5 4-5" />
      </svg>
    )
  }
];

/** Thread groups for the sidebar thread list */
const threadGroups: ThreadGroup[] = [
  {
    id: 'open-app',
    name: 'open-app',
    items: [
      { id: 'thread-1', title: 'Create Conductor implementation plan', time: '6h' },
      { id: 'thread-2', title: '[Image #1] run dev 后白屏', time: '1h' },
      {
        id: 'thread-3',
        title: 'run dev dep-BK3b2jBa.js:66689:67 at Array.map ...',
        time: '1h'
      },
      { id: 'thread-4', title: 'integrated tailwind css', time: '2h' },
      { id: 'thread-5', title: '> open-app@ dev /Users/chenlin/Desktop/open/o...', time: '2h' },
      { id: 'thread-6', title: 'test pnpm', time: '2h' },
      { id: 'thread-7', title: 'Generate a file named AGENTS.md that serves as ...', time: '5h' },
      { id: 'thread-8', title: 'open-app/ | ├── apps/ | └── desktop/ | └── ...', time: '5h' },
      { id: 'thread-9', title: 'open-app/ | ├── apps/ | └── desktop/ | └── ...', time: '5h' },
      { id: 'thread-10', title: '$spec-execute-plan', time: '6h' }
    ]
  },
  {
    id: 'new-project',
    name: 'New project',
    items: []
  }
];

/** Suggestion cards displayed in the hero section */
const suggestionCards = [
  {
    id: 'card-1',
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <rect x="3" y="6" width="14" height="8" rx="4" />
        <circle cx="8" cy="10" r="1.5" />
        <path d="M12 9h4M14 7v4" />
      </svg>
    ),
    title: 'Build a classic Snake\ngame in this repo.'
  },
  {
    id: 'card-2',
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M4 16l6-6 2 2-6 6H4z" />
        <path d="M12 4l4 4" />
        <path d="M14.5 2.5l1 1M17 5l1 1M11.5 1.5l1 1" />
      </svg>
    ),
    title: 'Create a one-page\n$pdf that summarizes\nthis app.'
  },
  {
    id: 'card-3',
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <rect x="4" y="3" width="12" height="14" rx="2" />
        <path d="M7 7h6M7 10h6M7 13h4" />
      </svg>
    ),
    title: "Summarize last week's\nPRs by teammate and\ntheme."
  }
];

/**
 * Main application component.
 * Renders the complete desktop application UI including sidebar,
 * navigation, thread list, hero section, and right panel.
 * @returns {JSX.Element} The rendered application
 */
export default function App() {
  const [activeNav, setActiveNav] = useState('new-thread');
  const [activeThread, setActiveThread] = useState('thread-1');
  const [changesView, setChangesView] = useState<'unstaged' | 'staged'>('staged');
  const [composerValue, setComposerValue] = useState('');
  const emptyTitle = changesView === 'staged' ? 'No staged changes' : 'No unstaged changes';
  const emptySubtitle =
    changesView === 'staged' ? 'Accept edits to stage them' : 'Working tree is clean';

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <button
                key={item.id}
                className={activeNav === item.id ? 'nav-item active' : 'nav-item'}
                onClick={() => setActiveNav(item.id)}
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
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M10 4v12M4 10h12" />
                  </svg>
                </button>
                <button className="icon-button" type="button" aria-label="Filter threads">
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M4 6h12" />
                    <path d="M6 10h8" />
                    <path d="M8 14h4" />
                  </svg>
                </button>
              </div>
            </div>

            {threadGroups.map((group) => (
              <div key={group.id} className="thread-group">
                <div className="group-title">
                  <span className="group-icon">
                    <svg viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M3.5 6.5h5l1.5 1.5H16a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 16 16H4a1.5 1.5 0 0 1-1.5-1.5V8a1.5 1.5 0 0 1 1.5-1.5z" />
                    </svg>
                  </span>
                  <span>{group.name}</span>
                </div>
                {group.items.length === 0 ? (
                  <div className="group-empty">No threads</div>
                ) : (
                  <div className="thread-list">
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        className={activeThread === item.id ? 'thread-item active' : 'thread-item'}
                        onClick={() => setActiveThread(item.id)}
                        type="button"
                      >
                        <span className="thread-title">{item.title}</span>
                        {item.time ? <span className="thread-time">{item.time}</span> : null}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="sidebar-bottom">
          <button className="nav-item" type="button">
            <span className="nav-icon">
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M8.2 3.5h3.6l.6 2.1 2 .8 1.8-1 2.5 2.5-1 1.8.8 2 2.1.6v3.6l-2.1.6-.8 2 1 1.8-2.5 2.5-1.8-1-2 .8-.6 2.1H8.2l-.6-2.1-2-.8-1.8 1-2.5-2.5 1-1.8-.8-2-2.1-.6v-3.6l2.1-.6.8-2-1-1.8 2.5-2.5 1.8 1 2-.8.6-2.1z" />
                <circle cx="10" cy="10" r="3" />
              </svg>
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
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 6l4 4 4-4" />
            </svg>
          </button>
          <div className="topbar-actions">
            <button className="pill-button" type="button">
              <span className="pill-icon">
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M5 6h7a3 3 0 0 1 0 6H9" />
                  <path d="M9 4l-3 2 3 2" />
                </svg>
              </span>
              Open
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4 6l4 4 4-4" />
              </svg>
            </button>
            <button className="pill-button" type="button">
              <span className="pill-icon">
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M6 5h8" />
                  <path d="M6 10h8" />
                  <path d="M6 15h8" />
                </svg>
              </span>
              Commit
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4 6l4 4 4-4" />
              </svg>
            </button>
            <button className="icon-button" type="button" aria-label="View mode">
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <rect x="3.5" y="4" width="13" height="12" rx="2" />
                <path d="M3.5 8h13" />
              </svg>
            </button>
            <button className="icon-button" type="button" aria-label="Share">
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M10 4v8" />
                <path d="M6.5 7.5L10 4l3.5 3.5" />
                <rect x="4" y="10" width="12" height="6" rx="2" />
              </svg>
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
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M4 6l4 4 4-4" />
                </svg>
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
                    <svg viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M7 7v6a3 3 0 0 0 6 0V6" />
                      <path d="M5 7a5 5 0 0 1 10 0v6a5 5 0 0 1-10 0V9" />
                    </svg>
                  </button>
                  <button className="icon-button" type="button" aria-label="Voice">
                    <svg viewBox="0 0 20 20" aria-hidden="true">
                      <rect x="7" y="4" width="6" height="10" rx="3" />
                      <path d="M4 10a6 6 0 0 0 12 0" />
                      <path d="M10 16v2" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="composer-controls">
                <div className="composer-left">
                  <button className="plus-button" type="button" aria-label="Add">
                    <svg viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M10 4v12M4 10h12" />
                    </svg>
                  </button>
                  <button className="model-button" type="button">
                    GPT-5.2-Codex High
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M4 6l4 4 4-4" />
                    </svg>
                  </button>
                </div>
                <button className="send-button" type="button" aria-label="Send">
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M4 10l12-6-3.5 6L16 16z" />
                  </svg>
                </button>
              </div>
              <div className="status-bar">
                <div className="status-left">
                  <span className="status-chip active">Local</span>
                  <span className="status-chip">Worktree</span>
                </div>
                <div className="status-right">
                  <span className="status-dot" />
                  <span>main</span>
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
                Unstaged
              </button>
              <button
                className={changesView === 'staged' ? 'panel-tab active' : 'panel-tab'}
                onClick={() => setChangesView('staged')}
                type="button"
              >
                Staged
              </button>
            </div>
            <div className="panel-empty">
              <p className="panel-empty-title">{emptyTitle}</p>
              <p className="panel-empty-subtitle">{emptySubtitle}</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

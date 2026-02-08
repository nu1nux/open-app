/**
 * @fileoverview Main application component for the desktop UI.
 * Renders the sidebar, navigation, thread list, and main content area.
 * @module renderer/App
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { useWorkspaceStore, useGitStore, useThreadStore, useDeleteStore } from './stores';
import { useInitApp } from './hooks/useInitApp';
import { FileList } from './components';
import type { ComposerSuggestion } from './types';
import { Button as BaseButton } from '@base-ui/react/button';
import { Input as BaseInput } from '@base-ui/react/input';
import {
  NewThreadIcon,
  FolderIcon,
  SendIcon,
  TrashIcon
} from './icons';

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

  const { current: workspace, list: workspaces, pick, setCurrent } = useWorkspaceStore();
  const { files: gitFiles } = useGitStore();
  const { threads, activeId: activeThread, setActive: setActiveThread, createThread } = useThreadStore();
  const { pending: pendingDeletes, requestThreadDelete, requestWorkspaceDelete, undoDelete } = useDeleteStore();

  const [changesView, setChangesView] = useState<'unstaged' | 'staged'>('staged');
  const [composerValue, setComposerValue] = useState('');
  const [composerSuggestions, setComposerSuggestions] = useState<ComposerSuggestion[]>([]);
  const [activeComposerSuggestion, setActiveComposerSuggestion] = useState(0);
  const [selectedMentionIds, setSelectedMentionIds] = useState<string[]>([]);
  const [composerBusy, setComposerBusy] = useState(false);
  const [modelOverride, setModelOverride] = useState<string | undefined>(undefined);
  const [deleteNow, setDeleteNow] = useState(() => Date.now());
  const [composerFeedback, setComposerFeedback] = useState<{
    tone: 'info' | 'error';
    text: string;
  } | null>(null);
  const composerInputRef = useRef<HTMLInputElement | null>(null);
  const suggestionRequestId = useRef(0);

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

  useEffect(() => {
    if (pendingDeletes.length === 0) return;
    const timer = window.setInterval(() => {
      setDeleteNow(Date.now());
    }, 250);
    return () => window.clearInterval(timer);
  }, [pendingDeletes.length]);

  const deleteThreadWithConfirm = async (threadId: string) => {
    const thread = threads.find((item) => item.id === threadId);
    if (!thread) return;
    const confirmed = window.confirm('Delete this thread? You can undo for 5 seconds.');
    if (!confirmed) return;
    await requestThreadDelete(thread);
  };

  const deleteWorkspaceWithConfirm = async () => {
    if (!workspace) return;
    const confirmed = window.confirm(
      'Remove this project from Open App? Files on disk will not be deleted. You can undo for 5 seconds.'
    );
    if (!confirmed) return;
    await requestWorkspaceDelete(workspace);
  };

  const closeComposerSuggestions = () => {
    setComposerSuggestions([]);
    setActiveComposerSuggestion(0);
  };

  const refreshComposerSuggestions = async (rawInput: string, cursor: number) => {
    if (!workspace) {
      closeComposerSuggestions();
      return;
    }

    const requestId = suggestionRequestId.current + 1;
    suggestionRequestId.current = requestId;

    try {
      const result = await window.openApp.composer.suggest({
        rawInput,
        cursor,
        workspaceId: workspace.id,
        threadId: activeThread
      });

      if (suggestionRequestId.current !== requestId) return;
      setComposerSuggestions(result.suggestions);
      setActiveComposerSuggestion(0);
    } catch {
      if (suggestionRequestId.current !== requestId) return;
      closeComposerSuggestions();
    }
  };

  const findMentionRange = (rawInput: string, cursor: number) => {
    const prefix = rawInput.slice(0, cursor);
    const match = prefix.match(/(?:^|\s)@([A-Za-z0-9_./-]*)$/);
    if (!match || match.index === undefined) return null;
    const localAt = match[0].lastIndexOf('@');
    if (localAt < 0) return null;
    const start = match.index + localAt;
    return { start, end: cursor };
  };

  const findCommandRange = (rawInput: string) => {
    const match = rawInput.match(/^\s*\/[^\s]*/);
    if (!match || match.index === undefined) return null;
    return {
      start: match.index,
      end: match.index + match[0].length
    };
  };

  const applyComposerSuggestion = (suggestion: ComposerSuggestion) => {
    if (!composerInputRef.current) return;

    const input = composerInputRef.current;
    const cursor = input.selectionStart ?? composerValue.length;
    let nextValue = composerValue;
    let nextCursor = cursor;

    if (suggestion.kind === 'command') {
      const range = findCommandRange(composerValue) ?? { start: 0, end: 0 };
      const trailing = composerValue.slice(range.end).trimStart();
      const insert = `/${suggestion.name}`;
      nextValue = `${composerValue.slice(0, range.start)}${insert}${trailing ? ` ${trailing}` : ' '}`;
      nextCursor = range.start + insert.length + 1;
    } else {
      const range = findMentionRange(composerValue, cursor);
      if (!range) return;
      const insert = `@${suggestion.value}`;
      nextValue = `${composerValue.slice(0, range.start)}${insert}${composerValue.slice(range.end)}`;
      nextCursor = range.start + insert.length;
      setSelectedMentionIds((previous) =>
        previous.includes(suggestion.id) ? previous : [...previous, suggestion.id]
      );
    }

    setComposerValue(nextValue);
    setComposerFeedback(null);
    closeComposerSuggestions();
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const submitComposer = async () => {
    if (!workspace || composerBusy) return;
    const rawInput = composerValue.trim();
    if (!rawInput) return;

    setComposerBusy(true);
    setComposerFeedback(null);

    const payload = {
      rawInput,
      cursor: rawInput.length,
      workspaceId: workspace.id,
      threadId: activeThread,
      selectedMentionIds,
      modelOverride
    };

    try {
      const prepared = await window.openApp.composer.prepare(payload);
      if (prepared.blocking) {
        setComposerFeedback({
          tone: 'error',
          text: prepared.diagnostics[0]?.message ?? 'Composer input validation failed.'
        });
        return;
      }

      const result = await window.openApp.composer.execute(payload);
      if (!result.ok) {
        setComposerFeedback({
          tone: 'error',
          text: result.diagnostics?.[0]?.message ?? result.output ?? 'Composer execution failed.'
        });
        return;
      }

      if (result.modelOverride) {
        setModelOverride(result.modelOverride);
      }

      if (result.action === 'clear') {
        setComposerValue('');
        setSelectedMentionIds([]);
        closeComposerSuggestions();
        setComposerFeedback({ tone: 'info', text: 'Composer cleared.' });
        return;
      }

      setComposerValue('');
      setSelectedMentionIds([]);
      closeComposerSuggestions();
      setComposerFeedback({
        tone: 'info',
        text: result.output ?? `Executed via ${result.provider}.`
      });
    } catch {
      setComposerFeedback({
        tone: 'error',
        text: 'Composer request failed. Check provider connection and try again.'
      });
    } finally {
      setComposerBusy(false);
    }
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <nav className="sidebar-nav">
            <BaseButton
              className="nav-item active"
              onClick={() => {
                if (workspace) {
                  createThread(workspace.id, 'New thread');
                } else {
                  void pick();
                }
              }}
              type="button"
            >
              <span className="nav-icon">
                <NewThreadIcon />
              </span>
              <span>New thread</span>
            </BaseButton>
          </nav>

          <div className="sidebar-section">
            <div className="section-header">
              <span className="section-title">Threads</span>
            </div>

            {workspace ? (
              <div className="thread-group">
                <div className="group-title">
                  <div className="group-title-main">
                    <span className="group-icon">
                      <FolderIcon />
                    </span>
                    <span>{workspace.name}</span>
                  </div>
                  <BaseButton
                    className="thread-item-delete project-delete"
                    type="button"
                    aria-label="Remove project"
                    onClick={deleteWorkspaceWithConfirm}
                  >
                    <TrashIcon />
                  </BaseButton>
                </div>
                {threads.length === 0 ? (
                  <div className="group-empty">No threads</div>
                ) : (
                  <div className="thread-list">
                    {threads.map((thread) => (
                      <div key={thread.id} className="thread-row">
                        <BaseButton
                          className={activeThread === thread.id ? 'thread-item active' : 'thread-item'}
                          onClick={() => setActiveThread(thread.id)}
                          type="button"
                        >
                          <span className="thread-title">{thread.title}</span>
                          <span className="thread-time">
                            {formatRelativeTime(thread.updatedAt)}
                          </span>
                        </BaseButton>
                        <BaseButton
                          className="thread-item-delete"
                          type="button"
                          aria-label={`Delete thread ${thread.title}`}
                          onClick={() => void deleteThreadWithConfirm(thread.id)}
                        >
                          <TrashIcon />
                        </BaseButton>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="thread-group">
                <BaseButton
                  className="project-picker-button"
                  type="button"
                  onClick={() => void pick()}
                >
                  <span className="group-icon">
                    <FolderIcon />
                  </span>
                  Select a project
                </BaseButton>
                {workspaces.length > 0 ? (
                  <>
                    <div className="group-title">
                      <span>Recent projects</span>
                    </div>
                    <div className="thread-list">
                      {workspaces.map((ws) => (
                        <BaseButton
                          key={ws.id}
                          className="thread-item"
                          type="button"
                          onClick={() => void setCurrent(ws.id)}
                        >
                          <span className="thread-title">{ws.name}</span>
                        </BaseButton>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="group-empty">No project selected</div>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="main-area">
        <div className="content">
          <section className="center-panel">
            <div className="hero-block">
              <div className="hero-icon">
                <span className="hero-dot" />
              </div>
              <h1 className="hero-title">Let&apos;s build</h1>
            </div>

            <div className="composer">
              <div className="composer-input-wrap">
                <div className="composer-input">
                  <BaseInput
                    ref={composerInputRef}
                    placeholder={
                      workspace
                        ? 'Ask Claude Code anything, @ to add files, / for commands'
                        : 'Type your message. Select a project to send.'
                    }
                    value={composerValue}
                    onChange={async (event) => {
                      const nextValue = event.target.value;
                      const cursor = event.target.selectionStart ?? nextValue.length;
                      setComposerValue(nextValue);
                      setComposerFeedback(null);
                      await refreshComposerSuggestions(nextValue, cursor);
                    }}
                    onClick={async (event) => {
                      await refreshComposerSuggestions(
                        event.currentTarget.value,
                        event.currentTarget.selectionStart ?? event.currentTarget.value.length
                      );
                    }}
                    onKeyDown={async (event) => {
                      const isComposing = (event.nativeEvent as KeyboardEvent).isComposing;
                      if (isComposing) return;

                      if (event.key === 'Enter') {
                        event.preventDefault();
                        await submitComposer();
                        return;
                      }

                      if (composerSuggestions.length > 0) {
                        if (event.key === 'ArrowDown') {
                          event.preventDefault();
                          setActiveComposerSuggestion((index) => (index + 1) % composerSuggestions.length);
                          return;
                        }
                        if (event.key === 'ArrowUp') {
                          event.preventDefault();
                          setActiveComposerSuggestion(
                            (index) => (index - 1 + composerSuggestions.length) % composerSuggestions.length
                          );
                          return;
                        }
                        if (event.key === 'Escape') {
                          event.preventDefault();
                          closeComposerSuggestions();
                          return;
                        }
                        if (event.key === 'Tab') {
                          event.preventDefault();
                          const suggestion = composerSuggestions[activeComposerSuggestion];
                          if (suggestion) {
                            applyComposerSuggestion(suggestion);
                          }
                          return;
                        }
                      }
                    }}
                  />
                  <BaseButton
                    className="send-button"
                    type="button"
                    aria-label="Send"
                    onClick={submitComposer}
                    disabled={!workspace || composerBusy || !composerValue.trim()}
                  >
                    <SendIcon />
                  </BaseButton>
                </div>
                {composerSuggestions.length > 0 ? (
                  <div className="composer-suggestions" role="listbox" aria-label="Composer suggestions">
                    {composerSuggestions.map((suggestion, index) => (
                      <BaseButton
                        key={suggestion.kind === 'command' ? suggestion.name : suggestion.id}
                        className={index === activeComposerSuggestion ? 'composer-suggestion active' : 'composer-suggestion'}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          applyComposerSuggestion(suggestion);
                        }}
                        type="button"
                      >
                        <span className="composer-suggestion-primary">
                          {suggestion.kind === 'command' ? `/${suggestion.name}` : `@${suggestion.display}`}
                        </span>
                        <span className="composer-suggestion-secondary">
                          {suggestion.kind === 'command' ? suggestion.description : suggestion.relativePath}
                        </span>
                      </BaseButton>
                    ))}
                  </div>
                ) : null}
              </div>
              {composerFeedback ? (
                <div className={composerFeedback.tone === 'error' ? 'composer-feedback error' : 'composer-feedback'}>
                  {composerFeedback.text}
                </div>
              ) : null}
            </div>
          </section>

          <aside className="right-panel">
            <div className="panel-tabs">
              <BaseButton
                className={changesView === 'unstaged' ? 'panel-tab active' : 'panel-tab'}
                onClick={() => setChangesView('unstaged')}
                type="button"
              >
                Unstaged ({unstagedFiles.length})
              </BaseButton>
              <BaseButton
                className={changesView === 'staged' ? 'panel-tab active' : 'panel-tab'}
                onClick={() => setChangesView('staged')}
                type="button"
              >
                Staged ({stagedFiles.length})
              </BaseButton>
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
      {pendingDeletes.length > 0 ? (
        <div className="delete-toast-stack">
          {pendingDeletes.map((action) => {
            const remaining = Math.max(0, Math.ceil((action.deadlineAt - deleteNow) / 1000));
            return (
              <div key={action.id} className="delete-toast">
                <span className="delete-toast-label">
                  {action.entityType === 'thread' ? 'Thread deleted' : 'Project removed'}
                </span>
                <span className="delete-toast-time">{remaining}s</span>
                <BaseButton
                  className="delete-toast-undo"
                  type="button"
                  onClick={() => void undoDelete(action.id)}
                >
                  Undo
                </BaseButton>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

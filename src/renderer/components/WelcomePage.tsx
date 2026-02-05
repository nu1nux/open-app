/**
 * @fileoverview Welcome page component displayed when no workspace is selected.
 * @module renderer/components/WelcomePage
 */

import type { WorkspaceEntry } from '../types';
import { useWorkspaceStore } from '../stores';
import { FolderIcon } from '../icons';

/**
 * Props for the WelcomePage component.
 */
type Props = {
  recentWorkspaces: WorkspaceEntry[];
};

/**
 * Welcome page component that guides users to select or open a project.
 * Displays a button to pick a folder and a list of recent workspaces.
 */
export function WelcomePage({ recentWorkspaces }: Props) {
  const { pick, setCurrent } = useWorkspaceStore();

  return (
    <div className="welcome-page">
      <div className="welcome-content">
        <h1 className="welcome-title">Let's get started</h1>

        <button className="welcome-pick-button" onClick={() => pick()} type="button">
          <FolderIcon />
          <span>Select a project folder</span>
        </button>

        {recentWorkspaces.length > 0 && (
          <div className="welcome-recent">
            <h2 className="welcome-recent-title">Recent projects</h2>
            <div className="welcome-recent-list">
              {recentWorkspaces.map((ws) => (
                <button
                  key={ws.id}
                  className="welcome-recent-item"
                  onClick={() => setCurrent(ws.id)}
                  type="button"
                >
                  <span className="welcome-recent-name">{ws.name}</span>
                  <span className="welcome-recent-path">{ws.path}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

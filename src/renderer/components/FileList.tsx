/**
 * @fileoverview File list component for displaying git file statuses.
 * @module renderer/components/FileList
 */

import type { GitFileStatus } from '../types';

/**
 * Props for the FileList component.
 */
type Props = {
  files: GitFileStatus[];
};

/**
 * Returns a human-readable label for a git status code.
 */
function getStatusLabel(status: string): string {
  const code = status.trim();
  if (code.startsWith('A') || code.endsWith('A')) return 'Added';
  if (code.startsWith('M') || code.endsWith('M')) return 'Modified';
  if (code.startsWith('D') || code.endsWith('D')) return 'Deleted';
  if (code.startsWith('R')) return 'Renamed';
  if (code === '??') return 'Untracked';
  return code;
}

/**
 * Returns a CSS class name for a git status code.
 */
function getStatusClass(status: string): string {
  const code = status.trim();
  if (code.startsWith('A') || code.endsWith('A')) return 'status-added';
  if (code.startsWith('M') || code.endsWith('M')) return 'status-modified';
  if (code.startsWith('D') || code.endsWith('D')) return 'status-deleted';
  return 'status-other';
}

/**
 * File list component that displays git file statuses.
 * Shows file path and status badge with color coding.
 */
export function FileList({ files }: Props) {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className="file-list">
      {files.map((file) => (
        <div key={file.path} className="file-item">
          <span className={`file-status ${getStatusClass(file.status)}`}>
            {getStatusLabel(file.status)}
          </span>
          <span className="file-path">{file.path}</span>
        </div>
      ))}
    </div>
  );
}

import React, { useRef, useState } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';

export const SourceStep: React.FC = () => {
  const { state, setProjectDraft } = useOnboarding();
  const { projectDraft } = state;
  const folderPickerRef = useRef<HTMLInputElement>(null);
  const [folderDisplay, setFolderDisplay] = useState('No folder selected');

  const handleModeSwitch = (mode: 'folder' | 'github') => {
    setProjectDraft({ sourceType: mode });
  };

  const handleBrowseClick = () => {
    folderPickerRef.current?.click();
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Extract folder path from webkitRelativePath
      const path = (file as any).webkitRelativePath || (file as any).path || '';
      const folderName = path.split('/')[0] || 'Selected folder';
      setFolderDisplay(folderName);
      setProjectDraft({ folderPath: folderName });
    }
  };

  return (
    <div className="ob-main">
      <h2 id="source-title" className="ob-title">
        Add Your Code and Docs
      </h2>

      {/* Mode switcher */}
      <div className="ob-mode-tabs" role="tablist" aria-label="Source type selection">
        <button
          className={`ob-mode-tab ${projectDraft.sourceType === 'folder' ? 'active' : ''}`}
          onClick={() => handleModeSwitch('folder')}
          role="tab"
          aria-selected={projectDraft.sourceType === 'folder'}
          aria-controls="onboard-folder-mode"
        >
          📁 Folder
        </button>
        <button
          className={`ob-mode-tab ${projectDraft.sourceType === 'github' ? 'active' : ''}`}
          onClick={() => handleModeSwitch('github')}
          role="tab"
          aria-selected={projectDraft.sourceType === 'github'}
          aria-controls="onboard-github-mode"
        >
          🔗 GitHub
        </button>
      </div>

      {/* Folder mode */}
      <div
        id="onboard-folder-mode"
        className={`ob-mode-content ${projectDraft.sourceType === 'folder' ? 'active' : ''}`}
        role="tabpanel"
        aria-labelledby="folder-tab"
      >
        <div className="ob-input-group">
          <label htmlFor="onboard-folder-path">Choose Folder</label>
          <input
            type="file"
            id="onboard-folder-picker"
            ref={folderPickerRef}
            {...({ webkitdirectory: 'true', directory: 'true' } as any)}
            multiple
            style={{ display: 'none' }}
            onChange={handleFolderChange}
            aria-hidden="true"
          />
          <div className="ob-file-input">
            <button
              id="onboard-folder-btn"
              className="ob-browse-btn"
              onClick={handleBrowseClick}
              type="button"
              aria-label="Browse for folder"
            >
              Browse...
            </button>
            <span id="onboard-folder-display" className="ob-file-display">
              {folderDisplay}
            </span>
          </div>
          <p className="ob-hint">Or enter path manually:</p>
          <input
            type="text"
            id="onboard-folder-path"
            className="ob-text-input"
            placeholder="/path/to/your/project"
            value={projectDraft.folderPath}
            onChange={(e) => setProjectDraft({ folderPath: e.target.value })}
            aria-label="Folder path"
          />
        </div>
      </div>

      {/* GitHub mode */}
      <div
        id="onboard-github-mode"
        className={`ob-mode-content ${projectDraft.sourceType === 'github' ? 'active' : ''}`}
        role="tabpanel"
        aria-labelledby="github-tab"
      >
        <div className="ob-input-group">
          <label htmlFor="onboard-github-url">Repository URL</label>
          <input
            type="text"
            id="onboard-github-url"
            className="ob-text-input"
            placeholder="https://github.com/owner/repo"
            value={projectDraft.githubUrl}
            onChange={(e) => setProjectDraft({ githubUrl: e.target.value })}
            aria-label="GitHub repository URL"
          />
        </div>
        <div className="ob-input-group">
          <label htmlFor="onboard-github-branch">Branch (optional)</label>
          <input
            type="text"
            id="onboard-github-branch"
            className="ob-text-input"
            placeholder="main"
            value={projectDraft.githubBranch}
            onChange={(e) => setProjectDraft({ githubBranch: e.target.value })}
            aria-label="GitHub branch name"
          />
        </div>
        <div className="ob-input-group">
          <label htmlFor="onboard-github-token">Personal Access Token (optional)</label>
          <input
            type="password"
            id="onboard-github-token"
            className="ob-text-input"
            placeholder="ghp_..."
            value={projectDraft.githubToken}
            onChange={(e) => setProjectDraft({ githubToken: e.target.value })}
            aria-label="GitHub personal access token"
          />
          <p className="ob-hint">
            Only used to clone; not stored unless you save this as a Project.
          </p>
        </div>
      </div>

      <div className="ob-info-box">
        We only read files you point us to. Nothing leaves your computer unless you turn on
        cloud.
      </div>
    </div>
  );
};

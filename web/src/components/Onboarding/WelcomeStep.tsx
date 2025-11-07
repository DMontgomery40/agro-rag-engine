import React from 'react';
import { OnboardingProjectDraft } from '../../hooks/useOnboarding';

interface WelcomeStepProps {
  onSourceSelect: (sourceType: 'folder' | 'github') => void;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onSourceSelect }) => {
  return (
    <div className="ob-main">
      <h2 className="ob-title">Welcome to AGRO</h2>
      <p className="ob-subtitle">
        Point AGRO at a folder or repo; in ~3 minutes it will answer questions about it.
      </p>

      <div className="ob-info-box">
        <p>
          We scan text, markdown, code, and docs. Nothing leaves your computer unless you turn on
          cloud.
        </p>
        <p>You can always start offline (keywords only) and add 'meaning' later.</p>
      </div>

      {/* Source choice cards */}
      <div className="ob-choice-cards">
        <button className="ob-card" onClick={() => onSourceSelect('folder')}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
          <h3>Use a Folder on This Computer</h3>
          <p>Index local files and docs</p>
        </button>
        <button className="ob-card" onClick={() => onSourceSelect('github')}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
          </svg>
          <h3>Use a GitHub Repo</h3>
          <p>Clone and index a repository</p>
        </button>
      </div>

      {/* Helpful links */}
      <div className="ob-links">
        <h4>Helpful Resources:</h4>
        <div className="ob-link-grid">
          <a href="/docs/START_HERE.md" target="_blank" rel="noopener noreferrer">
            Getting Started
          </a>
          <a href="/docs/API_GUI.md" target="_blank" rel="noopener noreferrer">
            GUI Overview
          </a>
          <a href="/docs/QUICKSTART_MCP.md" target="_blank" rel="noopener noreferrer">
            MCP Quickstart
          </a>
          <a href="/docs/MODEL_RECOMMENDATIONS.md" target="_blank" rel="noopener noreferrer">
            Model Recommendations
          </a>
          <a href="/docs/PERFORMANCE_AND_COST.md" target="_blank" rel="noopener noreferrer">
            Performance & Cost
          </a>
          <a href="/docs/MCP_README.md" target="_blank" rel="noopener noreferrer">
            MCP Details
          </a>
          <a href="/files/README.md" target="_blank" rel="noopener noreferrer">
            README
          </a>
          <a href="https://github.com/openai/codex" target="_blank" rel="noopener noreferrer">
            Codex CLI ↗
          </a>
          <a
            href="https://platform.openai.com/docs/guides/tools-connectors-mcp"
            target="_blank"
            rel="noopener noreferrer"
          >
            MCP Guide ↗
          </a>
          <a
            href="https://openai.github.io/openai-agents-python/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Agents SDK ↗
          </a>
          <a
            href="https://openai.com/index/introducing-agentkit/"
            target="_blank"
            rel="noopener noreferrer"
          >
            AgentKit ↗
          </a>
        </div>
      </div>
    </div>
  );
};

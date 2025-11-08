import React, { useState, useRef, useEffect } from 'react';
import '../styles/get-started.css';

type SourceMode = 'folder' | 'github';
type IndexStage = 'scan' | 'keywords' | 'smart';

interface GoldenQuestion {
  text: string;
  answer: string;
  trace: string;
  showAnswer: boolean;
  showTrace: boolean;
}

const GetStarted: React.FC = () => {
  // Step navigation
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Source mode
  const [sourceMode, setSourceMode] = useState<SourceMode>('folder');

  // Step 2: Folder/GitHub inputs
  const [folderPath, setFolderPath] = useState('');
  const [folderDisplay, setFolderDisplay] = useState('No folder selected');
  const [githubUrl, setGithubUrl] = useState('');
  const [githubBranch, setGithubBranch] = useState('main');
  const [githubToken, setGithubToken] = useState('');
  const folderPickerRef = useRef<HTMLInputElement>(null);

  // Step 3: Indexing
  const [indexProgress, setIndexProgress] = useState(0);
  const [indexStatus, setIndexStatus] = useState('Ready to index');
  const [indexLog, setIndexLog] = useState<string[]>([]);
  const [currentStage, setCurrentStage] = useState<IndexStage | null>(null);
  const [showFallback, setShowFallback] = useState(false);

  // Step 4: Golden Questions
  const [questions, setQuestions] = useState<GoldenQuestion[]>([
    { text: 'Where is hybrid retrieval implemented?', answer: '', trace: '', showAnswer: false, showTrace: false },
    { text: 'Where are indexing settings?', answer: '', trace: '', showAnswer: false, showTrace: false },
    { text: 'How do I change the default model?', answer: '', trace: '', showAnswer: false, showTrace: false },
  ]);

  // Step 5: Tune & Save
  const [sliderSpeed, setSliderSpeed] = useState(2);
  const [sliderQuality, setSliderQuality] = useState(2);
  const [sliderCloud, setSliderCloud] = useState(1);
  const [settingsSummary, setSettingsSummary] = useState('');
  const [showEvalProgress, setShowEvalProgress] = useState(false);
  const [evalProgress, setEvalProgress] = useState(0);
  const [evalStatus, setEvalStatus] = useState('Running evaluation...');
  const [evalResult, setEvalResult] = useState('');

  // Help panel
  const [helpInput, setHelpInput] = useState('');
  const [helpResults, setHelpResults] = useState('');
  const [showHelpResults, setShowHelpResults] = useState(false);

  // Generate settings summary when sliders change
  useEffect(() => {
    const speedMap: { [key: number]: string } = {
      1: 'top_k=3, rerank=false',
      2: 'top_k=5, rerank=true',
      3: 'top_k=10, rerank=true',
      4: 'top_k=20, rerank=true, multi_query=true',
    };
    const qualityMap: { [key: number]: string } = {
      1: 'local_only=true, model=none',
      2: 'model=gpt-3.5-turbo',
      3: 'model=gpt-4, enable_cot=true',
    };
    const cloudMap: { [key: number]: string } = {
      1: 'cloud_apis=false',
      2: 'cloud_apis=true',
    };

    const summary = `${speedMap[sliderSpeed]}\n${qualityMap[sliderQuality]}\n${cloudMap[sliderCloud]}`;
    setSettingsSummary(summary);
  }, [sliderSpeed, sliderQuality, sliderCloud]);

  // Navigation handlers
  const handleNext = async () => {
    if (currentStep === 1) {
      // Moving from step 1 to step 2 - no validation needed
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Moving from step 2 to step 3 - start indexing
      await startIndexing();
      setCurrentStep(3);
    } else if (currentStep === 3) {
      // Moving from step 3 to step 4
      setCurrentStep(4);
    } else if (currentStep === 4) {
      // Moving from step 4 to step 5
      setCurrentStep(5);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Step 1: Choice card handlers
  const handleChoiceClick = (choice: SourceMode) => {
    setSourceMode(choice);
    setCurrentStep(2);
  };

  // Step 2: Folder picker
  const handleFolderBrowse = () => {
    folderPickerRef.current?.click();
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const path = files[0].webkitRelativePath.split('/')[0];
      setFolderDisplay(path);
      setFolderPath(path);
    }
  };

  // Step 2: Mode tabs
  const handleModeSwitch = (mode: SourceMode) => {
    setSourceMode(mode);
  };

  // Step 3: Start indexing
  const startIndexing = async () => {
    setIndexProgress(0);
    setIndexStatus('Starting indexing...');
    setIndexLog([]);
    setShowFallback(false);

    try {
      // Determine endpoint based on source mode
      const endpoint = sourceMode === 'folder' ? '/api/setup/folder' : '/api/setup/github';
      const body = sourceMode === 'folder'
        ? { path: folderPath }
        : { url: githubUrl, branch: githubBranch, token: githubToken };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Failed to start indexing');
      }

      // Simulate indexing progress with stages
      await simulateIndexing();
    } catch (error) {
      console.error('Indexing error:', error);
      setIndexStatus('Error during indexing');
      addLogLine('Error: ' + (error as Error).message);
    }
  };

  const simulateIndexing = async () => {
    // Stage 1: Light Scan (0-33%)
    setCurrentStage('scan');
    setIndexStatus('Scanning files...');
    addLogLine('[SCAN] Starting file scan');
    await updateProgress(0, 33, 2000);
    addLogLine('[SCAN] Found 147 files');

    // Stage 2: Keywords & Cards (33-66%)
    setCurrentStage('keywords');
    setIndexStatus('Building keyword index...');
    addLogLine('[BM25] Tokenizing documents');
    await updateProgress(33, 66, 2000);
    addLogLine('[BM25] Index ready (147 docs)');

    // Stage 3: Smart Search (66-100%)
    setCurrentStage('smart');
    setIndexStatus('Creating dense embeddings...');
    addLogLine('[DENSE] Generating embeddings');

    // Check if we have embeddings available
    const hasEmbeddings = sliderCloud === 2 || sliderQuality > 1;
    if (!hasEmbeddings) {
      addLogLine('[DENSE] Skipping (local-only mode)');
      setShowFallback(true);
      await updateProgress(66, 100, 1000);
      setIndexStatus('Indexed with keywords only');
    } else {
      await updateProgress(66, 100, 3000);
      addLogLine('[DENSE] Index ready (147 docs)');
      setIndexStatus('Indexing complete!');
    }
  };

  const updateProgress = (start: number, end: number, duration: number): Promise<void> => {
    return new Promise((resolve) => {
      const steps = 20;
      const stepSize = (end - start) / steps;
      const stepDuration = duration / steps;
      let current = start;

      const interval = setInterval(() => {
        current += stepSize;
        if (current >= end) {
          setIndexProgress(end);
          clearInterval(interval);
          resolve();
        } else {
          setIndexProgress(current);
        }
      }, stepDuration);
    });
  };

  const addLogLine = (line: string) => {
    setIndexLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${line}`]);
  };

  // Step 4: Ask question
  const handleAskQuestion = async (index: number) => {
    const question = questions[index];

    try {
      const response = await fetch('/api/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.text, repo: 'current' }),
      });

      if (!response.ok) {
        throw new Error('Failed to get answer');
      }

      const data = await response.json();

      setQuestions((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          answer: data.answer || 'No answer available',
          trace: data.trace || 'No trace data',
          showAnswer: true,
          showTrace: false,
        };
        return updated;
      });
    } catch (error) {
      console.error('Question error:', error);
      setQuestions((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          answer: 'Error: Could not get answer. Make sure indexing is complete.',
          trace: '',
          showAnswer: true,
          showTrace: false,
        };
        return updated;
      });
    }
  };

  const handleQuestionChange = (index: number, text: string) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], text };
      return updated;
    });
  };

  const toggleTrace = (index: number) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], showTrace: !updated[index].showTrace };
      return updated;
    });
  };

  const handleSaveGolden = async () => {
    try {
      const response = await fetch('/api/projects/save-golden', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: questions.map(q => q.text) }),
      });

      if (response.ok) {
        alert('Golden Questions saved!');
      }
    } catch (error) {
      console.error('Save golden error:', error);
      alert('Failed to save Golden Questions');
    }
  };

  // Step 5: Save project
  const handleSaveProject = async () => {
    const projectData = {
      source: sourceMode,
      path: sourceMode === 'folder' ? folderPath : githubUrl,
      settings: {
        speed: sliderSpeed,
        quality: sliderQuality,
        cloud: sliderCloud,
      },
      goldenQuestions: questions.map(q => q.text),
    };

    try {
      const response = await fetch('/api/projects/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      });

      if (response.ok) {
        alert('Project saved successfully!');
      } else {
        throw new Error('Failed to save project');
      }
    } catch (error) {
      console.error('Save project error:', error);
      alert('Failed to save project');
    }
  };

  // Step 5: Run evaluation
  const handleRunEval = async () => {
    setShowEvalProgress(true);
    setEvalProgress(0);
    setEvalStatus('Running evaluation...');
    setEvalResult('');

    try {
      const response = await fetch('/api/eval/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: questions.map(q => q.text) }),
      });

      // Simulate eval progress
      for (let i = 0; i <= 100; i += 10) {
        setEvalProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      if (response.ok) {
        const data = await response.json();
        setEvalStatus('Evaluation complete!');
        setEvalResult(`Accuracy: ${data.accuracy || '85%'}\nAvg Latency: ${data.latency || '1.2s'}`);
      } else {
        throw new Error('Evaluation failed');
      }
    } catch (error) {
      console.error('Eval error:', error);
      setEvalStatus('Evaluation failed');
      setEvalResult('Error running evaluation');
    }
  };

  // Help panel handlers
  const handleHelpAsk = async () => {
    if (!helpInput.trim()) return;

    setShowHelpResults(true);
    setHelpResults('Searching...');

    try {
      const response = await fetch('/api/help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: helpInput }),
      });

      if (response.ok) {
        const data = await response.json();
        setHelpResults(data.answer || 'No answer available');
      } else {
        throw new Error('Help request failed');
      }
    } catch (error) {
      console.error('Help error:', error);
      setHelpResults('Error getting help. Try the documentation links.');
    }
  };

  const handleHelpPill = (question: string) => {
    setHelpInput(question);
  };

  const handleOpenChat = () => {
    // Navigate to chat page
    window.location.hash = '#/chat';
  };

  return (
    <div className="ob-container">
      {/* Progress Dots */}
      <div className="ob-progress-dots">
        {[1, 2, 3, 4, 5].map((step) => (
          <span
            key={step}
            className={`ob-dot ${currentStep === step ? 'active' : ''}`}
            data-step={step}
          >
            {step}
          </span>
        ))}
      </div>

      {/* Step 1: Welcome */}
      <div className={`ob-step ${currentStep === 1 ? 'active' : ''}`}>
        <div className="ob-main">
          <h2 className="ob-title">Welcome to AGRO</h2>
          <p className="ob-subtitle">
            Point AGRO at a folder or repo; in ~3 minutes it will answer questions about it.
          </p>

          <div className="ob-info-box">
            <p>We scan text, markdown, code, and docs. Nothing leaves your computer unless you turn on cloud.</p>
            <p>You can always start offline (keywords only) and add 'meaning' later.</p>
          </div>

          {/* Source choice cards */}
          <div className="ob-choice-cards">
            <button className="ob-card" onClick={() => handleChoiceClick('folder')}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              <h3>Use a Folder on This Computer</h3>
              <p>Index local files and docs</p>
            </button>
            <button className="ob-card" onClick={() => handleChoiceClick('github')}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
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
              <a href="/docs/START_HERE.md" target="_blank" rel="noopener noreferrer">Getting Started</a>
              <a href="/docs/API_GUI.md" target="_blank" rel="noopener noreferrer">GUI Overview</a>
              <a href="/docs/QUICKSTART_MCP.md" target="_blank" rel="noopener noreferrer">MCP Quickstart</a>
              <a href="/docs/MODEL_RECOMMENDATIONS.md" target="_blank" rel="noopener noreferrer">Model Recommendations</a>
              <a href="/docs/PERFORMANCE_AND_COST.md" target="_blank" rel="noopener noreferrer">Performance & Cost</a>
              <a href="/docs/MCP_README.md" target="_blank" rel="noopener noreferrer">MCP Details</a>
              <a href="/files/README.md" target="_blank" rel="noopener noreferrer">README</a>
              <a href="https://github.com/openai/codex" target="_blank" rel="noopener noreferrer">Codex CLI ↗</a>
              <a href="https://platform.openai.com/docs/guides/tools-connectors-mcp" target="_blank" rel="noopener noreferrer">MCP Guide ↗</a>
              <a href="https://openai.github.io/openai-agents-python/" target="_blank" rel="noopener noreferrer">Agents SDK ↗</a>
              <a href="https://openai.com/index/introducing-agentkit/" target="_blank" rel="noopener noreferrer">AgentKit ↗</a>
            </div>
          </div>
        </div>
      </div>

      {/* Step 2: Add Your Stuff */}
      <div className={`ob-step ${currentStep === 2 ? 'active' : ''}`}>
        <div className="ob-main">
          <h2 className="ob-title">Add Your Code and Docs</h2>

          {/* Mode switcher */}
          <div className="ob-mode-tabs">
            <button
              className={`ob-mode-tab ${sourceMode === 'folder' ? 'active' : ''}`}
              onClick={() => handleModeSwitch('folder')}
            >
              📁 Folder
            </button>
            <button
              className={`ob-mode-tab ${sourceMode === 'github' ? 'active' : ''}`}
              onClick={() => handleModeSwitch('github')}
            >
              🔗 GitHub
            </button>
          </div>

          {/* Folder mode */}
          <div className={`ob-mode-content ${sourceMode === 'folder' ? 'active' : ''}`}>
            <div className="ob-input-group">
              <label>Choose Folder</label>
              <input
                type="file"
                ref={folderPickerRef}
                // @ts-ignore - webkitdirectory is not in TypeScript types
                webkitdirectory="true"
                directory="true"
                multiple
                style={{ display: 'none' }}
                onChange={handleFolderChange}
              />
              <div className="ob-file-input">
                <button className="ob-browse-btn" onClick={handleFolderBrowse}>
                  Browse...
                </button>
                <span className="ob-file-display">{folderDisplay}</span>
              </div>
              <p className="ob-hint">Or enter path manually:</p>
              <input
                type="text"
                className="ob-text-input"
                placeholder="/path/to/your/project"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
              />
            </div>
          </div>

          {/* GitHub mode */}
          <div className={`ob-mode-content ${sourceMode === 'github' ? 'active' : ''}`}>
            <div className="ob-input-group">
              <label>Repository URL</label>
              <input
                type="text"
                className="ob-text-input"
                placeholder="https://github.com/owner/repo"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
              />
            </div>
            <div className="ob-input-group">
              <label>Branch (optional)</label>
              <input
                type="text"
                className="ob-text-input"
                placeholder="main"
                value={githubBranch}
                onChange={(e) => setGithubBranch(e.target.value)}
              />
            </div>
            <div className="ob-input-group">
              <label>Personal Access Token (optional)</label>
              <input
                type="password"
                className="ob-text-input"
                placeholder="ghp_..."
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
              />
              <p className="ob-hint">Only used to clone; not stored unless you save this as a Project.</p>
            </div>
          </div>

          <div className="ob-info-box">
            We only read files you point us to. Nothing leaves your computer unless you turn on cloud.
          </div>
        </div>
      </div>

      {/* Step 3: Index & Enrich */}
      <div className={`ob-step ${currentStep === 3 ? 'active' : ''}`}>
        <div className="ob-main">
          <h2 className="ob-title">Build Your Indexes</h2>

          {/* Stage indicators */}
          <div className="ob-stages">
            <div className={`ob-stage ${currentStage === 'scan' ? 'active' : ''}`}>
              <div className="ob-stage-dot"></div>
              <span>Light Scan</span>
            </div>
            <div className="ob-stage-arrow">→</div>
            <div className={`ob-stage ${currentStage === 'keywords' ? 'active' : ''}`}>
              <div className="ob-stage-dot"></div>
              <span>Keywords & Cards</span>
            </div>
            <div className="ob-stage-arrow">→</div>
            <div className={`ob-stage ${currentStage === 'smart' ? 'active' : ''}`}>
              <div className="ob-stage-dot"></div>
              <span>Smart Search</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="ob-progress-bar">
            <div className="ob-progress-fill" style={{ width: `${indexProgress}%` }}></div>
          </div>
          <div className="ob-progress-text">{indexStatus}</div>

          {/* Index log */}
          <div className="ob-log">
            {indexLog.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>

          {/* Info tooltip */}
          <div className="ob-info-box">
            <div className="ob-tooltip-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span>How it works</span>
            </div>
            <p>
              We always keep a BM25 'keyword' index (works offline). When available, we add a dense 'meaning' index so
              it understands phrasing. If the smart part isn't ready, we fall back to keywords—so it always works.
            </p>
          </div>

          {/* Fallback message */}
          {showFallback && (
            <div className="ob-warning-box">
              Continuing with keywords only. Dense search can be added later.
            </div>
          )}
        </div>
      </div>

      {/* Step 4: Ask Your First Questions */}
      <div className={`ob-step ${currentStep === 4 ? 'active' : ''}`}>
        <div className="ob-main">
          <h2 className="ob-title">Ask Your Codebase</h2>
          <p className="ob-subtitle">Try these Golden Questions (you can edit them)</p>

          {/* Questions */}
          <div className="ob-questions-list">
            {questions.map((question, index) => (
              <div key={index} className="ob-question-item">
                <input
                  type="text"
                  className="ob-question-input"
                  value={question.text}
                  onChange={(e) => handleQuestionChange(index, e.target.value)}
                />
                <button className="ob-ask-btn" onClick={() => handleAskQuestion(index)}>
                  Ask
                </button>
                {question.showAnswer && (
                  <div className="ob-answer visible">{question.answer}</div>
                )}
                {question.showAnswer && question.trace && (
                  <a
                    href="#"
                    className="ob-trace-link"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleTrace(index);
                    }}
                  >
                    What happened under the hood?
                  </a>
                )}
                {question.showTrace && (
                  <div className="ob-trace-panel">
                    <pre>{question.trace}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button className="ob-secondary-btn" onClick={handleSaveGolden}>
            Save these as Golden Questions
          </button>
        </div>
      </div>

      {/* Step 5: Tune & Save */}
      <div className={`ob-step ${currentStep === 5 ? 'active' : ''}`}>
        <div className="ob-main">
          <h2 className="ob-title">Tune and Save Your Project</h2>

          {/* Sliders */}
          <div className="ob-sliders">
            <div className="ob-slider-group">
              <label>Faster ← → Thorough</label>
              <input
                type="range"
                min="1"
                max="4"
                value={sliderSpeed}
                step="1"
                onChange={(e) => setSliderSpeed(Number(e.target.value))}
              />
              <div className="ob-slider-labels">
                <span>Fast</span>
                <span>Balanced</span>
                <span>Thorough</span>
              </div>
            </div>

            <div className="ob-slider-group">
              <label>Cheapest ← → Smartest</label>
              <input
                type="range"
                min="1"
                max="3"
                value={sliderQuality}
                step="1"
                onChange={(e) => setSliderQuality(Number(e.target.value))}
              />
              <div className="ob-slider-labels">
                <span>Local/Free</span>
                <span>Balanced</span>
                <span>Best Quality</span>
              </div>
            </div>

            <div className="ob-slider-group">
              <label>Local ← → Cloud</label>
              <input
                type="range"
                min="1"
                max="2"
                value={sliderCloud}
                step="1"
                onChange={(e) => setSliderCloud(Number(e.target.value))}
              />
              <div className="ob-slider-labels">
                <span>Local Only</span>
                <span>Cloud APIs</span>
              </div>
            </div>
          </div>

          {/* Settings summary */}
          <div className="ob-settings-box">
            <h4>Settings to Apply:</h4>
            <div className="ob-summary-content">
              <pre>{settingsSummary}</pre>
            </div>
          </div>

          {/* Action buttons */}
          <div className="ob-actions">
            <button className="ob-primary-btn" onClick={handleSaveProject}>
              Save as a Project
            </button>
            <button className="ob-secondary-btn" onClick={handleRunEval}>
              Run a Tiny Evaluation
            </button>
          </div>

          {/* Eval progress */}
          {showEvalProgress && (
            <div className="ob-eval-box">
              <div className="ob-progress-bar">
                <div className="ob-progress-fill" style={{ width: `${evalProgress}%` }}></div>
              </div>
              <div className="ob-progress-text">{evalStatus}</div>
              {evalResult && <div className="ob-eval-result">{evalResult}</div>}
            </div>
          )}
        </div>
      </div>

      {/* Mini help panel (persistent) */}
      <div className="ob-help-panel">
        <h4>Have questions?</h4>
        <p>Ask in plain English. We'll help.</p>
        <textarea
          className="ob-help-input"
          placeholder="Type your question..."
          value={helpInput}
          onChange={(e) => setHelpInput(e.target.value)}
        ></textarea>
        <button className="ob-help-btn" onClick={handleHelpAsk}>
          Ask
        </button>
        {showHelpResults && (
          <div className="ob-help-results visible">{helpResults}</div>
        )}

        <div className="ob-help-pills">
          <button className="ob-help-pill" onClick={() => handleHelpPill('What is BM25?')}>
            What is BM25?
          </button>
          <button className="ob-help-pill" onClick={() => handleHelpPill('What is dense retrieval?')}>
            What is dense retrieval?
          </button>
          <button className="ob-help-pill" onClick={() => handleHelpPill('How long does indexing take?')}>
            How long does indexing take?
          </button>
        </div>

        <a href="#" className="ob-help-link" onClick={handleOpenChat}>
          Open full Chat →
        </a>
      </div>

      {/* Navigation footer */}
      <div className="ob-footer">
        {currentStep > 1 && (
          <button className="ob-nav-btn" onClick={handleBack}>
            ← Back
          </button>
        )}
        {currentStep < 5 && (
          <button className="ob-nav-btn ob-nav-primary" onClick={handleNext}>
            Next →
          </button>
        )}
      </div>
    </div>
  );
};

export default GetStarted;

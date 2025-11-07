import { useState, useCallback, useEffect } from 'react';

export interface OnboardingProjectDraft {
  sourceType: 'folder' | 'github';
  folderPath: string;
  githubUrl: string;
  githubBranch: string;
  githubToken: string;
  saveToken: boolean;
}

export interface OnboardingQuestion {
  text: string;
  answer: string | null;
}

export interface OnboardingSettings {
  speed: number;
  quality: number;
  cloud: number;
}

export interface IndexingState {
  running: boolean;
  stage: 'idle' | 'scan' | 'keywords' | 'smart';
  progress: number;
  status: string;
  log: string[];
}

export interface OnboardingState {
  step: number;
  maxStep: number;
  projectDraft: OnboardingProjectDraft;
  indexing: IndexingState;
  questions: OnboardingQuestion[];
  settings: OnboardingSettings;
  isComplete: boolean;
}

const initialState: OnboardingState = {
  step: 1,
  maxStep: 5,
  projectDraft: {
    sourceType: 'folder',
    folderPath: '',
    githubUrl: '',
    githubBranch: 'main',
    githubToken: '',
    saveToken: false,
  },
  indexing: {
    running: false,
    stage: 'idle',
    progress: 0,
    status: 'Ready to index',
    log: [],
  },
  questions: [
    { text: 'Where is hybrid retrieval implemented?', answer: null },
    { text: 'Where are indexing settings?', answer: null },
    { text: 'How do I change the default model?', answer: null },
  ],
  settings: {
    speed: 2,
    quality: 2,
    cloud: 1,
  },
  isComplete: false,
};

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>(() => {
    // Try to restore from localStorage
    try {
      const savedStep = localStorage.getItem('onboarding_step');
      const savedState = localStorage.getItem('onboarding_state');
      if (savedStep && savedState) {
        const parsed = JSON.parse(savedState);
        return { ...initialState, ...parsed, step: parseInt(savedStep, 10) };
      }
    } catch (e) {
      console.warn('[useOnboarding] Failed to restore state:', e);
    }
    return initialState;
  });

  // Persist state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('onboarding_step', String(state.step));
      localStorage.setItem('onboarding_state', JSON.stringify(state));
    } catch (e) {
      console.warn('[useOnboarding] Failed to persist state:', e);
    }
  }, [state]);

  const setStep = useCallback((step: number) => {
    if (step >= 1 && step <= state.maxStep) {
      setState((prev) => ({ ...prev, step }));
    }
  }, [state.maxStep]);

  const nextStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      step: Math.min(prev.step + 1, prev.maxStep),
    }));
  }, []);

  const prevStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      step: Math.max(prev.step - 1, 1),
    }));
  }, []);

  const setProjectDraft = useCallback((draft: Partial<OnboardingProjectDraft>) => {
    setState((prev) => ({
      ...prev,
      projectDraft: { ...prev.projectDraft, ...draft },
    }));
  }, []);

  const setIndexing = useCallback((indexing: Partial<IndexingState>) => {
    setState((prev) => ({
      ...prev,
      indexing: { ...prev.indexing, ...indexing },
    }));
  }, []);

  const setQuestion = useCallback((index: number, updates: Partial<OnboardingQuestion>) => {
    setState((prev) => {
      const questions = [...prev.questions];
      questions[index] = { ...questions[index], ...updates };
      return { ...prev, questions };
    });
  }, []);

  const setSettings = useCallback((settings: Partial<OnboardingSettings>) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...settings },
    }));
  }, []);

  const setComplete = useCallback((complete: boolean) => {
    setState((prev) => ({ ...prev, isComplete: complete }));
  }, []);

  // Backend integration functions
  const checkCompletion = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/onboarding/state');
      const data = await response.json();
      if (data.ok && data.completed) {
        setComplete(true);
        return true;
      }
      return false;
    } catch (e) {
      console.error('[useOnboarding] Failed to check completion:', e);
      return false;
    }
  }, [setComplete]);

  const saveCompletion = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.ok) {
        setComplete(true);
        try {
          localStorage.removeItem('onboarding_step');
          localStorage.removeItem('onboarding_state');
        } catch {}
        return true;
      }
      return false;
    } catch (e) {
      console.error('[useOnboarding] Failed to save completion:', e);
      return false;
    }
  }, [setComplete]);

  const startIndexing = useCallback(async () => {
    setIndexing({ running: true, stage: 'scan', progress: 20, status: 'Scanning files...' });

    try {
      // Start the indexing process
      const startRes = await fetch('/api/index/start', { method: 'POST' });
      if (!startRes.ok) {
        throw new Error('Failed to start indexing');
      }

      // Poll for indexing status
      let running = true;
      while (running) {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const statusRes = await fetch('/api/index/status');
        const statusData = await statusRes.json();

        if (statusData.lines) {
          setIndexing({ log: statusData.lines });
        }

        running = statusData.running !== false;

        if (!running) {
          // Build cards after indexing completes
          setIndexing({ stage: 'keywords', progress: 70, status: 'Building cards...' });
          await fetch('/api/cards/build', { method: 'POST' });

          setIndexing({
            stage: 'smart',
            progress: 100,
            status: 'Indexing complete!',
            running: false
          });
        }
      }
    } catch (err) {
      console.error('[useOnboarding] Indexing error:', err);
      setIndexing({
        progress: 70,
        status: 'Indexing completed with keyword-only mode',
        running: false,
      });
    }
  }, [setIndexing]);

  const askQuestion = useCallback(async (index: number, repo: string = 'agro'): Promise<void> => {
    const question = state.questions[index];
    if (!question || !question.text.trim()) return;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.text, repo }),
      });

      if (!response.ok) {
        throw new Error('Failed to get answer');
      }

      const data = await response.json();
      setQuestion(index, { answer: data.answer || 'No answer received' });
    } catch (err) {
      console.error('[useOnboarding] Question error:', err);
      setQuestion(index, { answer: `Error: ${err instanceof Error ? err.message : 'Unknown error'}` });
    }
  }, [state.questions, setQuestion]);

  const saveAsProject = useCallback(async (projectName: string): Promise<boolean> => {
    if (!projectName.trim()) return false;

    const { speed, quality, cloud } = state.settings;
    const profile = {
      name: projectName.trim(),
      sources: state.projectDraft,
      settings: {
        MQ_REWRITES: speed,
        LANGGRAPH_FINAL_K: 10 + speed * 5,
        RERANK_BACKEND: quality === 1 ? 'none' : quality === 2 ? 'local' : 'cohere',
        GEN_MODEL: quality === 1 ? 'local' : 'gpt-4o-mini',
        EMBEDDING_TYPE: cloud === 1 ? 'local' : 'openai',
      },
      golden: state.questions.map((q) => q.text),
    };

    try {
      const saveRes = await fetch('/api/profiles/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      if (!saveRes.ok) {
        throw new Error('Failed to save project');
      }

      // Apply the profile
      await fetch('/api/profiles/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_name: projectName.trim() }),
      });

      return true;
    } catch (err) {
      console.error('[useOnboarding] Save project error:', err);
      return false;
    }
  }, [state.projectDraft, state.questions, state.settings]);

  const runEvaluation = useCallback(async (): Promise<{ success: boolean; score?: number; error?: string }> => {
    try {
      await fetch('/api/eval/run', { method: 'POST' });

      let running = true;
      while (running) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const statusRes = await fetch('/api/eval/status');
        const statusData = await statusRes.json();
        running = statusData.running === true;

        if (!running) {
          const resRes = await fetch('/api/eval/results');
          const resData = await resRes.json();
          const score = resData.top1_accuracy || resData.topk_accuracy || 0;
          return { success: true, score };
        }
      }
      return { success: false, error: 'Evaluation timeout' };
    } catch (err) {
      console.error('[useOnboarding] Eval error:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, []);

  const askHelpQuestion = useCallback(async (question: string, repo: string = 'agro'): Promise<string> => {
    if (!question.trim()) return '';

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, repo }),
      });

      if (!response.ok) {
        throw new Error('Failed to get answer');
      }

      const data = await response.json();
      return data.answer || 'No answer received';
    } catch (err) {
      console.error('[useOnboarding] Help question error:', err);
      throw err;
    }
  }, []);

  return {
    state,
    setStep,
    nextStep,
    prevStep,
    setProjectDraft,
    setIndexing,
    setQuestion,
    setSettings,
    setComplete,
    checkCompletion,
    saveCompletion,
    startIndexing,
    askQuestion,
    saveAsProject,
    runEvaluation,
    askHelpQuestion,
  };
}

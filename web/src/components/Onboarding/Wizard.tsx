import React, { useEffect } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { WelcomeStep } from './WelcomeStep';
import { SourceStep } from './SourceStep';
import { IndexStep } from './IndexStep';
import { QuestionsStep } from './QuestionsStep';
import { TuneStep } from './TuneStep';
import { HelpPanel } from './HelpPanel';

export function Wizard() {
  const { state, setStep, nextStep, prevStep, setProjectDraft } = useOnboarding();
  const { step, maxStep } = state;

  // Navigation handler for welcome step
  const handleSourceSelect = (sourceType: 'folder' | 'github') => {
    setProjectDraft({ sourceType });
    nextStep();
  };

  // Navigation handlers
  const handleNext = () => {
    nextStep();
  };

  const handleBack = () => {
    prevStep();
  };

  return (
    <div className="ob-container">
      {/* Progress indicator */}
      <div className="ob-progress-dots">
        {Array.from({ length: maxStep }, (_, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === step;
          const isCompleted = stepNum < step;

          return (
            <span
              key={stepNum}
              className={`ob-dot ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              data-step={stepNum}
              role="button"
              tabIndex={0}
              aria-label={`Step ${stepNum} of ${maxStep}`}
              aria-current={isActive ? 'step' : undefined}
              onClick={() => setStep(stepNum)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setStep(stepNum);
                }
              }}
            >
              {stepNum}
            </span>
          );
        })}
      </div>

      {/* Step 1: Welcome */}
      <div
        id="onboard-welcome"
        className={`ob-step ${step === 1 ? 'active' : ''}`}
        role="region"
        aria-labelledby="welcome-title"
      >
        <WelcomeStep onSourceSelect={handleSourceSelect} />
      </div>

      {/* Step 2: Add Source */}
      <div
        id="onboard-source"
        className={`ob-step ${step === 2 ? 'active' : ''}`}
        role="region"
        aria-labelledby="source-title"
      >
        <SourceStep />
      </div>

      {/* Step 3: Index & Enrich */}
      <div
        id="onboard-index"
        className={`ob-step ${step === 3 ? 'active' : ''}`}
        role="region"
        aria-labelledby="index-title"
      >
        <IndexStep />
      </div>

      {/* Step 4: Ask Questions */}
      <div
        id="onboard-questions"
        className={`ob-step ${step === 4 ? 'active' : ''}`}
        role="region"
        aria-labelledby="questions-title"
      >
        <QuestionsStep />
      </div>

      {/* Step 5: Tune & Save */}
      <div
        id="onboard-tune"
        className={`ob-step ${step === 5 ? 'active' : ''}`}
        role="region"
        aria-labelledby="tune-title"
      >
        <TuneStep />
      </div>

      {/* Navigation footer */}
      <div className="ob-footer">
        <button
          id="onboard-back"
          className="ob-nav-btn"
          onClick={handleBack}
          disabled={step === 1}
          style={{ display: step === 1 ? 'none' : 'block' }}
          aria-label="Go to previous step"
        >
          ← Back
        </button>
        <button
          id="onboard-next"
          className="ob-nav-btn ob-nav-primary"
          onClick={handleNext}
          disabled={step === maxStep}
          style={{ display: step === 1 || step === maxStep ? 'none' : 'block' }}
          aria-label={step === maxStep ? 'Complete wizard' : 'Go to next step'}
        >
          {step === maxStep ? 'Done' : 'Next →'}
        </button>
      </div>

      {/* Help Panel - Always visible on side */}
      <HelpPanel />
    </div>
  );
}

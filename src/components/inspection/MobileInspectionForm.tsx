'use client';

import { useState } from 'react';

type Step = 'photos' | 'checklist' | 'damages' | 'signatures' | 'submit';

const STEPS: { key: Step; label: string }[] = [
  { key: 'photos', label: 'Photos' },
  { key: 'checklist', label: 'Checklist' },
  { key: 'damages', label: 'Damage' },
  { key: 'signatures', label: 'Signatures' },
  { key: 'submit', label: 'Review & Submit' },
];

interface MobileInspectionFormProps {
  children: React.ReactNode[];
}

export default function MobileInspectionForm({ children }: MobileInspectionFormProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const totalSteps = Math.min(children.length, STEPS.length);
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;

  return (
    <div className="flex flex-col min-h-[calc(100vh-var(--mobile-nav-height,4rem)-8rem)]">
      {/* Progress bar */}
      <div className="flex gap-1 mb-3">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-1 rounded-full transition-colors ${
              i <= currentStep ? 'bg-primary' : 'bg-neutral-200'
            }`}
          />
        ))}
      </div>

      <p className="text-xs text-neutral-500 mb-4">
        Step {currentStep + 1} of {totalSteps}:{' '}
        <span className="font-medium text-neutral-700">{STEPS[currentStep]?.label}</span>
      </p>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto pb-2">
        {children[currentStep]}
      </div>

      {/* Navigation buttons */}
      <div className="flex gap-3 pt-4 border-t border-neutral-100 mt-4">
        {!isFirst && (
          <button
            onClick={() => setCurrentStep((s) => s - 1)}
            className="flex-1 py-3 rounded-xl border border-neutral-300 text-neutral-600 text-sm font-medium active:scale-95 transition-transform"
          >
            Back
          </button>
        )}
        {!isLast && (
          <button
            onClick={() => setCurrentStep((s) => s + 1)}
            className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-medium active:scale-95 transition-transform"
          >
            Next
          </button>
        )}
        {isLast && (
          <div className="flex-1" />
        )}
      </div>
    </div>
  );
}

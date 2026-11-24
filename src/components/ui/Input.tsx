import React, { useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label, error, helperText, leftIcon, rightIcon, className = '', id,
  'aria-describedby': describedBy, 'aria-invalid': invalid, ...props
}) => {
  const uniqueId = useId();
  const inputId = id ?? uniqueId;
  const feedback = error || helperText;
  const feedbackId = inputId + '-feedback';
  const description = [describedBy, feedback && feedbackId].filter(Boolean).join(' ');

  return (
    <div className="min-w-0 space-y-1.5">
      {label && <label htmlFor={inputId} className="block text-sm font-semibold text-slate-700">{label}</label>}
      <div className="relative">
        {leftIcon && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-500">
            {leftIcon}
          </div>
        )}
        <input
          {...props}
          id={inputId}
          aria-invalid={error ? true : invalid}
          aria-describedby={description || undefined}
          className={`portal-field min-w-0 ${leftIcon ? 'pl-10' : 'pl-3.5'} ${rightIcon ? 'pr-10' : 'pr-3.5'} ${className}`}
        />
        {rightIcon && <div className="absolute inset-y-0 right-3.5 flex items-center text-slate-500">{rightIcon}</div>}
      </div>
      {feedback && (
        <p id={feedbackId} className={`text-xs leading-relaxed ${error ? 'font-semibold text-rose-700' : 'text-slate-600'}`}>
          {feedback}
        </p>
      )}
    </div>
  );
};

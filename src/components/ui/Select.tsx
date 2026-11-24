import React, { useId } from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: { value: string | number; label: string }[];
}

export const Select: React.FC<SelectProps> = ({
  label, error, helperText, options, children, className = '', id,
  'aria-describedby': describedBy, 'aria-invalid': invalid, ...props
}) => {
  const uniqueId = useId();
  const selectId = id ?? uniqueId;
  const feedback = error || helperText;
  const feedbackId = selectId + '-feedback';
  const description = [describedBy, feedback && feedbackId].filter(Boolean).join(' ');

  return (
    <div className="min-w-0 space-y-1.5">
      {label && <label htmlFor={selectId} className="block text-sm font-semibold text-slate-700">{label}</label>}
      <select
        {...props}
        id={selectId}
        aria-invalid={error ? true : invalid}
        aria-describedby={description || undefined}
        className={`portal-field min-w-0 px-3.5 ${className}`}
      >
        {options ? options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        )) : children}
      </select>
      {feedback && (
        <p id={feedbackId} className={`text-xs leading-relaxed ${error ? 'font-semibold text-rose-700' : 'text-slate-600'}`}>
          {feedback}
        </p>
      )}
    </div>
  );
};

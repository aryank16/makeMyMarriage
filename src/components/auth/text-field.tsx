'use client';

import { useId } from 'react';

type Props = {
  id: string;
  label: string;
  type?: 'text' | 'email';
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  error?: string;
};

/** The non-secret counterpart to PasswordField, so errors look the same. */
export default function TextField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  autoComplete,
  disabled = false,
  required = true,
  placeholder,
  hint,
  error,
}: Props) {
  const hintId = useId();
  const errorId = useId();
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[14px] font-medium text-ink mb-2"
      >
        {label}
      </label>

      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className={`input-field${error ? ' input-field--error' : ''}`}
      />

      {error ? (
        <p id={errorId} className="mt-2 text-[13px] text-accent">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="mt-2 text-[13px] text-ink-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

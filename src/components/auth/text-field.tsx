'use client';

import { useId } from 'react';

type Props = {
  id: string;
  label: string;
  type?: 'text' | 'email' | 'date';
  /** Controlled use: pass both. Omit both for a form that posts its own values. */
  value?: string;
  onChange?: (value: string) => void;
  defaultValue?: string;
  autoComplete?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  error?: string;
};

/**
 * The non-secret counterpart to PasswordField, so errors look the same.
 *
 * Works either way round. The auth forms hold their values in state because
 * they validate before submitting; a form posting straight to a server action
 * has no reason to, and passing `value` without `onChange` would freeze the
 * input, so the two modes are kept apart rather than blended.
 */
export default function TextField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  defaultValue,
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

  const controlled = value !== undefined && onChange !== undefined;
  const valueProps = controlled
    ? { value, onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value) }
    : { defaultValue };

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
        disabled={disabled}
        placeholder={placeholder}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className={`input-field${error ? ' input-field--error' : ''}`}
        {...valueProps}
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

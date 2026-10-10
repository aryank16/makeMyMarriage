'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <path d="M10.6 5.2A9.9 9.9 0 0 1 12 5c6.4 0 10 7 10 7a18.4 18.4 0 0 1-2.4 3.4" />
      <path d="M6.2 6.6A18.3 18.3 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.1-1.4" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <line x1="3" y1="3" x2="21" y2="21" />
    </svg>
  );
}

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  disabled?: boolean;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
  /** Rendered on the right of the label row — the login page's "Forgot?" link. */
  labelAccessory?: ReactNode;
  hint?: string;
  error?: string;
};

/**
 * A password input with a reveal toggle.
 *
 * Shared so sign-in, sign-up and the reset form cannot drift apart. The toggle
 * is type="button" — inside a form a bare <button> submits, which would post
 * the form every time someone tried to check what they had typed.
 */
export default function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  disabled = false,
  required = true,
  minLength,
  placeholder = '••••••••••••',
  labelAccessory,
  hint,
  error,
}: Props) {
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingSelection = useRef<{ start: number; end: number } | null>(null);
  const hintId = useId();
  const errorId = useId();
  // Point the input at whichever note is actually on screen; the error
  // replaces the hint rather than stacking with it.
  const describedBy = error ? errorId : hint ? hintId : undefined;

  /**
   * Peeking must not cost you your place.
   *
   * A real mouse click moves focus to the button, and switching the input's
   * type resets its caret to 0 — so someone checking a password mid-word came
   * back to the start of the field. The selection is captured here and put
   * back in the effect below, which runs after the type attribute has
   * actually changed; restoring any earlier is undone by that change.
   *
   * Only captured when focus was already in the input. A keyboard user who
   * tabbed to this button and pressed Space should stay on the button rather
   * than being thrown into the field.
   */
  function toggle() {
    const el = inputRef.current;
    if (el && document.activeElement === el) {
      pendingSelection.current = {
        start: el.selectionStart ?? 0,
        end: el.selectionEnd ?? 0,
      };
    }
    setVisible((v) => !v);
  }

  useEffect(() => {
    const selection = pendingSelection.current;
    pendingSelection.current = null;

    const el = inputRef.current;
    if (!selection || !el) return;

    el.focus();
    try {
      el.setSelectionRange(selection.start, selection.end);
    } catch {
      // Some browsers refuse setSelectionRange on certain input types.
    }
  }, [visible]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label htmlFor={id} className="text-[14px] font-medium text-ink">
          {label}
        </label>
        {labelAccessory}
      </div>

      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          name={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={`input-field input-field--with-affix${error ? ' input-field--error' : ''}`}
        />
        <button
          type="button"
          // Stops the browser pulling focus out of the input on mousedown,
          // which is what loses the caret in the first place.
          onMouseDown={(e) => e.preventDefault()}
          onClick={toggle}
          disabled={disabled}
          // The label states the action, not the state, so a screen reader
          // announces what pressing it will do.
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          aria-controls={id}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-ink-muted hover:text-ink disabled:opacity-50 disabled:hover:text-ink-muted transition-colors"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>

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

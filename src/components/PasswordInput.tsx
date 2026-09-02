"use client";

import { useState } from "react";

/** A password <input> with a show/hide eye button, since several people
 * using this app (owner, managers) may not be confident typing a hidden
 * password correctly — letting them view it before submitting cuts down on
 * mistyped-password lockout confusion. */
export function PasswordInput({
  id,
  value,
  onChange,
  required,
  autoComplete,
  minLength,
  placeholder,
  className = "",
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  autoComplete?: string;
  minLength?: number;
  placeholder?: string;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        required={required}
        autoComplete={autoComplete}
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full pr-11 px-4 py-2 border border-[#D0D5DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        tabIndex={-1}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-on-surface-variant hover:text-primary transition-colors"
      >
        <span className="material-symbols-outlined text-[20px]">{visible ? "visibility_off" : "visibility"}</span>
      </button>
    </div>
  );
}

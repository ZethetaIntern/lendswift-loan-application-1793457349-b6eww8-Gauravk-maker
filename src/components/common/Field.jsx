import React, { useId } from "react";

export default function Field({
  label,
  name,
  value,
  onChange,
  error,
  type = "text",
  required = false,
  hint,
  ...props
}) {
  const generatedId = useId();
  const id = props.id || name || generatedId;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>

      {hint && (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      )}

      <input
        {...props}
        id={id}
        name={name}
        type={type}
        {...(typeof onChange === "function"
          ? { value: value ?? "", onChange }
          : value !== undefined
            ? { value, readOnly: true }
            : {})}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={describedBy}
      />

      {error && (
        <p id={errorId} className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

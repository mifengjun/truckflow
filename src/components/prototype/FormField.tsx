import { useId, type ReactElement, cloneElement } from "react";
export function FormField({
  label,
  error,
  hint,
  children,
  required = false,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactElement<{
    id?: string;
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
  }>;
  required?: boolean;
}) {
  const id = useId();
  return (
    <div className="form-field">
      <label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {cloneElement(children, {
        id,
        "aria-invalid": !!error,
        "aria-describedby": error || hint ? `${id}-help` : undefined,
      })}
      {(error || hint) && (
        <p id={`${id}-help`} className={error ? "field-error" : "field-hint"}>
          {error || hint}
        </p>
      )}
    </div>
  );
}

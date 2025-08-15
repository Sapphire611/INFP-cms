import * as React from "react"

import { cn } from "@/lib/utils"

import { useState, useCallback } from 'react';

function Input({ className, type, value: propValue, defaultValue, onChange: propOnChange, ...props }: React.ComponentProps<"input">) {
  // Ensure consistent controlled/uncontrolled behavior
  const [isControlled] = useState(() => propValue !== undefined);
  const [internalValue, setInternalValue] = useState(defaultValue);

  // Use controlled value if provided, otherwise use internal state
  const value = isControlled ? propValue : internalValue;

  // Create onChange handler that works for both controlled and uncontrolled
  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (propOnChange) {
      propOnChange(e);
    }
    if (!isControlled) {
      setInternalValue(e.target.value);
    }
  }, [propOnChange, isControlled]);

  // Prevent switching between controlled/uncontrolled
  const safeProps = isControlled ?
    { ...props, value, onChange } :
    { ...props, defaultValue, onChange };
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...safeProps}
    />
  )
}

export { Input }

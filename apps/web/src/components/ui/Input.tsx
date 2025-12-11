import React from "react"; import { cn } from "../../lib/ui";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => {
  return <input ref={ref} {...props} className={cn("h-9 w-full rounded-xl border border-border-default bg-surface px-3 text-text-primary outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors", props.className)} />;
});

Input.displayName = "Input";

export default Input;

import React from "react";
import { cn } from "../../lib/ui";

export default function Select({
  children,
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "h-10 w-full rounded-xl border border-border-default bg-surface px-3 text-text-primary outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors",
        className
      )}
    >
      {children}
    </select>
  );
}

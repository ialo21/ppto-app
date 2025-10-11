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
        "h-10 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900",
        className
      )}
    >
      {children}
    </select>
  );
}

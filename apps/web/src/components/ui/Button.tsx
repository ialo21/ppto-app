import React from "react";
import { cn } from "../../lib/ui";
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary"|"secondary"|"ghost"; size?: "sm"|"md"|"lg" };
export default function Button({ className, variant="primary", size="md", ...props }: Props){
  const base = "inline-flex items-center justify-center rounded-2xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-brand-primary hover:bg-brand-hover text-white shadow-soft",
    secondary: "bg-surface-active hover:bg-surface-hover text-text-primary dark:text-gray-200 border border-border-default dark:border-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600",
    ghost: "hover:bg-surface-hover dark:hover:bg-slate-700 text-text-primary dark:text-gray-200"
  } as const;
  const sizes = { sm: "h-8 px-3 text-sm", md: "h-10 px-4", lg: "h-12 px-6 text-lg" } as const;
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}

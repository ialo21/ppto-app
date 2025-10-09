import React from "react";
import { cn } from "../../lib/ui";
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary"|"secondary"|"ghost"; size?: "sm"|"md"|"lg" };
export default function Button({ className, variant="primary", size="md", ...props }: Props){
  const base = "inline-flex items-center justify-center rounded-2xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-brand-600 hover:bg-brand-700 text-white shadow-soft",
    secondary: "bg-slate-200 hover:bg-slate-300 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-50",
    ghost: "hover:bg-slate-100 dark:hover:bg-slate-800"
  } as const;
  const sizes = { sm: "h-8 px-3 text-sm", md: "h-10 px-4", lg: "h-12 px-6 text-lg" } as const;
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}

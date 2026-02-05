import React from "react";
import { cn } from "../../lib/ui";

export function Table({ children, className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return <table className={cn("w-full border-collapse", className)} {...props}>{children}</table>;
}

export function Th({ children, className, ...props }: React.ThHTMLAttributes<HTMLTableHeaderCellElement>) {
  return <th className={cn("text-left text-sm font-semibold text-text-secondary dark:text-gray-400 border-b border-border-default dark:border-slate-700 p-2", className)} {...props}>{children}</th>;
}

export function Td({ children, className, ...props }: React.TdHTMLAttributes<HTMLTableDataCellElement>) {
  return <td className={cn("border-b border-border-light dark:border-slate-700 p-2 text-sm text-text-primary dark:text-gray-200", className)} {...props}>{children}</td>;
}

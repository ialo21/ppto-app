import React from "react";
import { cn } from "../../lib/ui";

export function Table({ children, className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return <table className={cn("w-full border-collapse", className)} {...props}>{children}</table>;
}

export function Th({ children, className, ...props }: React.ThHTMLAttributes<HTMLTableHeaderCellElement>) {
  return <th className={cn("text-left text-sm font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 p-2", className)} {...props}>{children}</th>;
}

export function Td({ children, className, ...props }: React.TdHTMLAttributes<HTMLTableDataCellElement>) {
  return <td className={cn("border-b border-slate-100 dark:border-slate-800 p-2 text-sm", className)} {...props}>{children}</td>;
}

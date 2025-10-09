import React from "react";
export default function Select({ children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>){
  return <select {...p} className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-900 dark:border-slate-700">{children}</select>
}

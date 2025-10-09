import React from "react";
export function Table({ children }: {children: React.ReactNode}){ return <table className="w-full border-collapse">{children}</table>; }
export function Th({ children }: {children: React.ReactNode}){ return <th className="text-left text-sm font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 p-2">{children}</th>; }
export function Td({ children }: {children: React.ReactNode}){ return <td className="border-b border-slate-100 dark:border-slate-800 p-2 text-sm">{children}</td>; }

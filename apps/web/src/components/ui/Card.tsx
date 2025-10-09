import React from "react"; import { cn } from "../../lib/ui";
export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>){ return <div className={cn("rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft", className)} {...p}/> }
export function CardHeader({ className, ...p }: React.HTMLAttributes<HTMLDivElement>){ return <div className={cn("p-4 border-b border-slate-100 dark:border-slate-800", className)} {...p}/> }
export function CardContent({ className, ...p }: React.HTMLAttributes<HTMLDivElement>){ return <div className={cn("p-4", className)} {...p}/> }

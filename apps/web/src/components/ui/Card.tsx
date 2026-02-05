import React from "react"; import { cn } from "../../lib/ui";
export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>){ return <div className={cn("rounded-2xl border border-border-default bg-surface dark:bg-slate-800/90 dark:border-slate-600 shadow-soft dark:shadow-slate-900/50", className)} {...p}/> }
export function CardHeader({ className, ...p }: React.HTMLAttributes<HTMLDivElement>){ return <div className={cn("p-4 border-b border-border-light dark:border-slate-600", className)} {...p}/> }
export function CardContent({ className, ...p }: React.HTMLAttributes<HTMLDivElement>){ return <div className={cn("p-4", className)} {...p}/> }

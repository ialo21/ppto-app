import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, NavLink, Outlet } from "react-router-dom";
import "./index.css";
import { Toaster, toast } from "sonner";
import { Home, Wallet, ListChecks, FileText, BarChart3, Settings as SettingsIcon, Layers } from "lucide-react";
import Button from "./components/ui/Button";

const qc = new QueryClient();

function Sidebar(){
  const link = "flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800";
  const active = "bg-slate-200 dark:bg-slate-800";
  return (
    <aside className="w-64 shrink-0 p-3">
      <div className="text-xl font-bold px-3 py-2">PPTO TI</div>
      <nav className="space-y-1">
        <NavLink to="/" end className={({isActive})=>`${link} ${isActive?active:""}`}><Home size={18}/>Dashboard</NavLink>
        <NavLink to="/supports" className={({isActive})=>`${link} ${isActive?active:""}`}><Layers size={18}/>Sustentos</NavLink>
        <NavLink to="/budget" className={({isActive})=>`${link} ${isActive?active:""}`}><Wallet size={18}/>PPTO</NavLink>
        <NavLink to="/control-lines" className={({isActive})=>`${link} ${isActive?active:""}`}><ListChecks size={18}/>Líneas</NavLink>
        <NavLink to="/invoices" className={({isActive})=>`${link} ${isActive?active:""}`}><FileText size={18}/>Facturas</NavLink>
        <NavLink to="/reports" className={({isActive})=>`${link} ${isActive?active:""}`}><BarChart3 size={18}/>Reportes</NavLink>
        <NavLink to="/settings" className={({isActive})=>`${link} ${isActive?active:""}`}><SettingsIcon size={18}/>Ajustes</NavLink>
      </nav>
    </aside>
  );
}

function Topbar(){
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/70 backdrop-blur p-3">
      <div className="font-medium">PPTO App — MVP</div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={()=>document.documentElement.classList.toggle("dark")}>Tema</Button>
      </div>
    </header>
  );
}

function AppLayout(){
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar />
        <main className="container-page">
          <Outlet />
        </main>
      </div>
      <Toaster position="top-center" richColors />
    </div>
  );
}

// Pages (stubs conectados a endpoints existentes más abajo)
import Dashboard from "./pages/Dashboard";
import SupportsPage from "./pages/SupportsPage";
import BudgetPage from "./pages/BudgetPage";
import ControlLinesPage from "./pages/ControlLinesPage";
import InvoicesPage from "./pages/InvoicesPage";
import ReportsPage from "./pages/ReportsPage";
function SettingsPage(){ return <div><h1 className="text-2xl font-semibold">Ajustes</h1></div>; }

const router = createBrowserRouter([
  { element: <AppLayout />, children: [
    { path: "/", element: <Dashboard /> },
    { path: "/supports", element: <SupportsPage /> },
    { path: "/budget", element: <BudgetPage /> },
    { path: "/control-lines", element: <ControlLinesPage /> },
    { path: "/invoices", element: <InvoicesPage /> },
    { path: "/reports", element: <ReportsPage /> },
    { path: "/settings", element: <SettingsPage /> }
  ] }
]);

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={qc}>
    <RouterProvider router={router} />
  </QueryClientProvider>
);
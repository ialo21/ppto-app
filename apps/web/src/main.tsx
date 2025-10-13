import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, NavLink, Outlet } from "react-router-dom";
import "./index.css";
import { Toaster } from "sonner";
import { Home, Wallet, ListChecks, FileText, BarChart3, Archive, ShoppingCart } from "lucide-react";
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
        <NavLink to="/budget" className={({isActive})=>`${link} ${isActive?active:""}`}><Wallet size={18}/>PPTO</NavLink>
        <NavLink to="/control-lines" className={({isActive})=>`${link} ${isActive?active:""}`}><ListChecks size={18}/>Lineas</NavLink>
        <NavLink to="/purchase-orders" className={({isActive})=>`${link} ${isActive?active:""}`}><ShoppingCart size={18}/>Órdenes de Compra</NavLink>
        <NavLink to="/invoices" className={({isActive})=>`${link} ${isActive?active:""}`}><FileText size={18}/>Facturas</NavLink>
        <NavLink to="/reports" className={({isActive})=>`${link} ${isActive?active:""}`}><BarChart3 size={18}/>Reportes</NavLink>
        <NavLink to="/settings" className={({isActive})=>`${link} ${isActive?active:""}`}><Archive size={18}/>Catálogos</NavLink>
      </nav>
    </aside>
  );
}

function Topbar(){
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/70 backdrop-blur p-3">
      <div className="font-medium">PPTO App - MVP</div>
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

// Pages (stubs conectados a endpoints existentes mas abajo)
import Dashboard from "./pages/Dashboard";
import BudgetPage from "./pages/BudgetPage";
import ControlLinesPage from "./pages/ControlLinesPage";
import PurchaseOrdersPage from "./pages/PurchaseOrdersPage";
import InvoicesPage from "./pages/InvoicesPage";
import ReportsPage from "./pages/ReportsPage";
import CatalogsPage from "./pages/SettingsPage";

const router = createBrowserRouter([
  { element: <AppLayout />, children: [
    { path: "/", element: <Dashboard /> },
    { path: "/budget", element: <BudgetPage /> },
    { path: "/control-lines", element: <ControlLinesPage /> },
    { path: "/purchase-orders", element: <PurchaseOrdersPage /> },
    { path: "/invoices", element: <InvoicesPage /> },
    { path: "/reports", element: <ReportsPage /> },
    { path: "/settings", element: <CatalogsPage /> }
  ] }
]);

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={qc}>
    <RouterProvider router={router} />
  </QueryClientProvider>
);

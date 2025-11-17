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
  const link = "flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-white/90 hover:bg-white/20 hover:text-white";
  const active = "bg-white/30 text-white font-medium";
  return (
    <aside className="sidebar-fixed">
      <div className="text-xl font-bold px-3 py-2 text-white">PPTO TI</div>
      <nav className="space-y-1">
        <NavLink to="/" end className={({isActive})=>`${link} ${isActive?active:""}`}><Home size={18}/>Dashboard</NavLink>
        <NavLink to="/ppto" className={({isActive})=>`${link} ${isActive?active:""}`}><Wallet size={18}/>PPTO</NavLink>
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
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border-default bg-surface/80 backdrop-blur p-3">
      <div className="font-medium text-text-primary">PPTO App - MVP</div>
    </header>
  );
}

function AppLayout(){
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-64">
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
    { path: "/ppto", element: <BudgetPage /> },
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

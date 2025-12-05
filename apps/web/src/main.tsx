import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, NavLink, Outlet, Navigate, useNavigate } from "react-router-dom";
import "./index.css";
import { Toaster } from "sonner";
import { Home, Wallet, FileText, BarChart3, Archive, ShoppingCart, Calendar, Menu, X, Sparkles, Shield, LogOut, User } from "lucide-react";
import Button from "./components/ui/Button";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

const qc = new QueryClient();

// Mapeo de permisos a rutas del sidebar
const sidebarItems = [
  { path: "/", label: "Dashboard", icon: Home, permission: "dashboard", end: true },
  { path: "/assistant", label: "Asistente", icon: Sparkles, permission: "assistant" },
  { path: "/reports", label: "Reportes", icon: BarChart3, permission: "reports" },
  { path: "/invoices", label: "Facturas", icon: FileText, permission: "facturas" },
  { path: "/purchase-orders", label: "Órdenes de Compra", icon: ShoppingCart, permission: "ocs" },
  { path: "/provisions", label: "Provisiones", icon: Calendar, permission: "provisiones" },
  { path: "/ppto", label: "PPTO", icon: Wallet, permission: "ppto" },
  { path: "/settings", label: "Catálogos", icon: Archive, permission: "catalogos" }
];

function Sidebar({ 
  isCollapsed, 
  isOpen, 
  isMobile, 
  onMouseEnter, 
  onMouseLeave,
  onClose 
}: { 
  isCollapsed: boolean;
  isOpen: boolean;
  isMobile: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClose?: () => void;
}){
  const { hasPermission } = useAuth();
  const link = "flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 text-white/90 hover:bg-white/20 hover:text-white";
  const active = "bg-white/30 text-white font-medium";
  
  // Filtrar items según permisos del usuario
  const allowedItems = sidebarItems.filter(item => hasPermission(item.permission));
  
  // En mobile: si no está abierto, no renderizar nada
  if (isMobile && !isOpen) {
    return null;
  }
  
  return (
    <>
      {/* Overlay de fondo solo en mobile cuando está abierto */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}
      
      <aside 
        className={`sidebar-fixed transition-all duration-300 ease-in-out ${
          isMobile ? 'sidebar-mobile' : ''
        } ${
          isCollapsed && !isMobile ? 'sidebar-collapsed' : ''
        } ${
          isOpen && isMobile ? 'sidebar-mobile-open' : ''
        }`}
        onMouseEnter={!isMobile ? onMouseEnter : undefined}
        onMouseLeave={!isMobile ? onMouseLeave : undefined}
      >
        <nav className="space-y-1">
          {allowedItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink 
                key={item.path}
                to={item.path} 
                end={item.end}
                className={({isActive})=>`${link} ${isActive?active:""}`} 
                title={item.label}
                onClick={isMobile ? onClose : undefined}
              >
                <Icon size={18} className="flex-shrink-0"/>
                {(!isCollapsed || isMobile) && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

function Topbar({ onToggleSidebar, isSidebarCollapsed, showMenuButton }: { onToggleSidebar: () => void; isSidebarCollapsed: boolean; showMenuButton: boolean }){
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  async function handleLogout() {
    await logout();
    // Usar replace para forzar recarga completa y evitar navegación hacia atrás
    window.location.replace("/login");
  }
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-border-default bg-white shadow-sm px-4 py-3">
      <div className="flex items-center gap-4">
        {showMenuButton && (
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label={isSidebarCollapsed ? "Abrir menú" : "Cerrar menú"}
          >
            {isSidebarCollapsed ? <Menu size={20} className="text-gray-700" /> : <X size={20} className="text-gray-700" />}
          </button>
        )}
        <div className="font-semibold text-lg text-gray-800">PORTAL PPTO</div>
      </div>
      
      <div className="relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <User size={18} className="text-gray-700" />
          <span className="text-sm text-gray-700">{user?.name || user?.email}</span>
        </button>
        
        {showUserMenu && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowUserMenu(false)}
            />
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <div className="px-4 py-2 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-800">{user?.name || "Usuario"}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              
              {hasPermission("manage_roles") && (
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate("/roles");
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <Shield size={16} />
                  Administrar Roles
                </button>
              )}
              
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <LogOut size={16} />
                Cerrar Sesión
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

// Componente para rutas protegidas
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

// Hook personalizado para detectar tamaño de pantalla
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handleChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    
    // Listener moderno
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}

function AppLayout(){
  // Detectar si estamos en desktop (lg breakpoint = 1024px en Tailwind)
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  
  // Estado para desktop: colapsado por defecto
  const [isCollapsedDesktop, setIsCollapsedDesktop] = useState(true);
  
  // Estado para mobile: cerrado por defecto
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  // Handlers para hover en desktop
  const handleMouseEnter = () => {
    if (isDesktop) {
      setIsCollapsedDesktop(false);
    }
  };
  
  const handleMouseLeave = () => {
    if (isDesktop) {
      setIsCollapsedDesktop(true);
    }
  };
  
  // Handler para toggle en mobile
  const handleToggleMobile = () => {
    setIsMobileOpen(!isMobileOpen);
  };
  
  // Cerrar sidebar mobile
  const handleCloseMobile = () => {
    setIsMobileOpen(false);
  };
  
  // Calcular margen izquierdo del contenido
  const getMainMargin = () => {
    if (!isDesktop) {
      return 'ml-0'; // En mobile, sin margen (sidebar en overlay)
    }
    return isCollapsedDesktop ? 'ml-16' : 'ml-64';
  };
  
  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        {/* Header global full-width */}
        <Topbar 
          onToggleSidebar={handleToggleMobile} 
          isSidebarCollapsed={!isMobileOpen}
          showMenuButton={!isDesktop}
        />
        
        {/* Layout principal: sidebar + contenido */}
        <div className="flex pt-[57px]"> {/* pt = altura del header (p-3 = 12px top/bottom + border) */}
          <Sidebar 
            isCollapsed={isCollapsedDesktop}
            isOpen={isMobileOpen}
            isMobile={!isDesktop}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClose={handleCloseMobile}
          />
          
          {/* Contenido principal con margen izquierdo dinámico */}
          <main className={`flex-1 w-full bg-brand-background transition-all duration-300 ease-in-out ${
            getMainMargin()
          }`}>
            <div className="container-page">
              <Outlet />
            </div>
          </main>
        </div>
        
        <Toaster position="top-center" richColors />
      </div>
    </ProtectedRoute>
  );
}

// Pages (stubs conectados a endpoints existentes mas abajo)
import Dashboard from "./pages/Dashboard";
import AssistantPage from "./pages/AssistantPage";
import BudgetPage from "./pages/BudgetPage";
import PurchaseOrdersPage from "./pages/PurchaseOrdersPage";
import InvoicesPage from "./pages/InvoicesPage";
import ProvisionsPage from "./pages/ProvisionsPage";
import ReportsPage from "./pages/ReportsPage";
import CatalogsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import RolesPage from "./pages/RolesPage";

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { element: <AppLayout />, children: [
    { path: "/", element: <Dashboard /> },
    { path: "/assistant", element: <AssistantPage /> },
    { path: "/reports", element: <ReportsPage /> },
    { path: "/invoices", element: <InvoicesPage /> },
    { path: "/purchase-orders", element: <PurchaseOrdersPage /> },
    { path: "/provisions", element: <ProvisionsPage /> },
    { path: "/ppto", element: <BudgetPage /> },
    { path: "/settings", element: <CatalogsPage /> },
    { path: "/roles", element: <RolesPage /> }
  ] }
]);

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={qc}>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </QueryClientProvider>
);

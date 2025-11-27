import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { UserRole } from '../types';
import { 
  LogOut, 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  Menu,
  X,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Palette
} from 'lucide-react';
import { Link, useLocation, Navigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const Layout: React.FC<LayoutProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme, layoutMode, toggleLayoutMode } = useTheme();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-slate-900">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Acesso Negado</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4">Você não tem permissão para acessar esta página.</p>
          <Link to="/" className="text-blue-600 hover:underline">Voltar ao Início</Link>
        </div>
      </div>
    );
  }

  const navItems = [
    { 
      label: 'Dashboard', 
      path: '/', 
      icon: LayoutDashboard, 
      roles: [UserRole.MANAGER, UserRole.SALESPERSON, UserRole.CASHIER] 
    },
    { 
      label: 'Vendas', 
      path: '/sales', 
      icon: ShoppingCart, 
      roles: [UserRole.MANAGER, UserRole.SALESPERSON, UserRole.CASHIER] 
    },
    { 
      label: 'Produtos', 
      path: '/products', 
      icon: Package, 
      roles: [UserRole.MANAGER, UserRole.SALESPERSON] 
    },
    { 
      label: 'Equipe de Vendas', 
      path: '/sellers', 
      icon: Briefcase, 
      roles: [UserRole.MANAGER] 
    },
    { 
      label: 'Usuários', 
      path: '/users', 
      icon: Users, 
      roles: [UserRole.MANAGER] 
    },
  ];

  const filteredNav = navItems.filter(item => user && item.roles.includes(user.role));
  
  const isModern = layoutMode === 'modern';

  // Base background classes
  const mainBgClass = isModern 
    ? "bg-zinc-50 dark:bg-[#0b0c15]" 
    : "bg-gray-100 dark:bg-slate-900";

  // Sidebar styling logic
  const sidebarBaseClass = isModern
    ? "bg-white dark:bg-[#121420] border-r border-gray-200 dark:border-white/5"
    : "bg-slate-900 dark:bg-slate-950 text-white";

  const headerBgClass = isModern
    ? "bg-transparent"
    : "bg-slate-950 dark:bg-black";

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-200 ${mainBgClass}`}>
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 transform transition-all duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isCollapsed ? 'w-64 lg:w-20' : 'w-64'}
        ${sidebarBaseClass}
        ${isModern ? 'lg:m-3 lg:rounded-3xl lg:shadow-2xl shadow-indigo-500/10' : ''}
      `}>
        {/* Header */}
        <div className={`flex items-center h-20 transition-all duration-300 ${isCollapsed ? 'justify-center px-0' : 'justify-between px-6'} ${headerBgClass} ${isModern ? 'rounded-t-3xl' : ''}`}>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className={`text-xl font-bold tracking-wider whitespace-nowrap ${isModern ? 'text-indigo-600 dark:text-indigo-400' : 'text-white'}`}>
                ERP SALES
              </span>
              {isModern && <span className="text-[10px] uppercase tracking-widest text-gray-400">Manager</span>}
            </div>
          )}
          {isCollapsed && (
            <div className={`text-xl font-bold ${isModern ? 'text-indigo-600' : 'text-white'}`}>ERP</div>
          )}
          
          {/* Mobile Close Button */}
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-gray-400">
            <X size={24} />
          </button>

          {/* Desktop Collapse Button */}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)} 
            className={`hidden lg:flex items-center justify-center transition-colors 
              ${isModern 
                ? 'text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400' 
                : 'text-gray-400 hover:text-white absolute -right-3 top-6 bg-slate-800 rounded-full p-1 border border-slate-700 shadow-lg'
              }
            `}
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={isModern ? 18 : 20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className={`space-y-2 overflow-y-auto custom-scrollbar ${isModern ? 'px-3 py-4' : 'p-4'}`}>
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            // Modern Styles
            if (isModern) {
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  title={isCollapsed ? item.label : ''}
                  className={`flex items-center py-3 rounded-2xl transition-all duration-300 group relative
                    ${isActive 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-indigo-600 dark:hover:text-indigo-300'}
                    ${isCollapsed ? 'justify-center px-0' : 'space-x-3 px-4'}
                  `}
                >
                  <Icon size={20} className={`shrink-0 ${isActive ? 'animate-pulse' : ''}`} />
                  {!isCollapsed && <span className="whitespace-nowrap overflow-hidden font-medium">{item.label}</span>}
                   {isCollapsed && (
                    <div className="absolute left-full ml-4 px-3 py-1 bg-indigo-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl">
                      {item.label}
                    </div>
                  )}
                </Link>
              );
            }

            // Classic Styles
            return (
              <Link
                key={item.path}
                to={item.path}
                title={isCollapsed ? item.label : ''}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center py-3 rounded-lg transition-colors group relative
                  ${isActive 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:bg-slate-800 hover:text-white'}
                  ${isCollapsed ? 'justify-center px-0' : 'space-x-3 px-4'}
                `}
              >
                <Icon size={20} className="shrink-0" />
                {!isCollapsed && <span className="whitespace-nowrap overflow-hidden transition-all duration-200">{item.label}</span>}
                
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg border border-slate-700">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
        
        {/* Footer Actions */}
        <div className={`absolute bottom-0 w-full p-4 ${isModern ? 'bg-transparent' : 'bg-slate-950 dark:bg-black border-t border-slate-800'}`}>
           {/* Theme & Layout Toggles */}
           <div className={`flex flex-col gap-2 mb-4 ${isCollapsed ? 'items-center' : ''}`}>
              <button
                onClick={toggleTheme}
                title="Alternar Tema (Claro/Escuro)"
                className={`flex items-center text-sm transition-colors w-full
                  ${isModern 
                    ? `p-2 rounded-xl border border-gray-200 dark:border-white/10 ${theme === 'dark' ? 'bg-white/5 text-yellow-400' : 'bg-white text-orange-500'} hover:bg-gray-50 dark:hover:bg-white/10` 
                    : `text-gray-400 hover:text-white hover:bg-slate-900 rounded-lg py-2 ${isCollapsed ? 'justify-center px-0' : 'px-4 space-x-3'}`
                  }
                `}
              >
                {theme === 'dark' ? <Sun size={isModern ? 18 : 20} className="shrink-0" /> : <Moon size={isModern ? 18 : 20} className="shrink-0" />}
                {!isCollapsed && <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>}
              </button>

              <button
                onClick={toggleLayoutMode}
                title="Alternar Layout (Clássico/Moderno)"
                className={`flex items-center text-sm transition-colors w-full
                  ${isModern 
                    ? `p-2 rounded-xl border border-gray-200 dark:border-white/10 text-indigo-500 hover:bg-gray-50 dark:hover:bg-white/10` 
                    : `text-gray-400 hover:text-white hover:bg-slate-900 rounded-lg py-2 ${isCollapsed ? 'justify-center px-0' : 'px-4 space-x-3'}`
                  }
                `}
              >
                <Palette size={isModern ? 18 : 20} className="shrink-0" />
                {!isCollapsed && <span>{isModern ? 'Visual Clássico' : 'Visual Moderno'}</span>}
              </button>
           </div>

          {/* User Profile */}
          <div className={`flex items-center mb-4 pt-4 border-t ${isModern ? 'border-gray-200 dark:border-white/10' : 'border-slate-800'} ${isCollapsed ? 'justify-center px-0 flex-col gap-2' : 'space-x-3 px-2'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 cursor-default shadow-md
                ${isModern ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white' : 'bg-blue-500 text-white'}
            `} title={user?.name}>
              {user?.name.charAt(0)}
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <p className={`text-sm font-medium truncate w-32 ${isModern ? 'text-gray-700 dark:text-gray-200' : 'text-gray-200'}`}>{user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate capitalize">{user?.role?.toLowerCase()}</p>
              </div>
            )}
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            title="Sair do Sistema"
            className={`flex items-center w-full py-2 text-sm rounded-lg transition-colors group
               ${isModern 
                 ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' 
                 : 'text-red-400 hover:bg-slate-900'
               }
               ${isCollapsed ? 'justify-center px-0' : 'space-x-2 px-4 justify-center'}
            `}
          >
            <LogOut size={16} className="shrink-0 group-hover:scale-110 transition-transform" />
            {!isCollapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className={`flex items-center justify-between px-6 py-4 lg:hidden border-b ${isModern ? 'bg-white/80 dark:bg-[#121420]/80 backdrop-blur-md border-gray-200 dark:border-white/5' : 'bg-white dark:bg-slate-800 dark:border-slate-700'}`}>
          <button onClick={() => setIsSidebarOpen(true)} className="text-gray-600 dark:text-gray-300">
            <Menu size={24} />
          </button>
          <span className="font-semibold text-gray-800 dark:text-white">ERP Sales Manager</span>
          <div className="w-6" /> {/* Spacer */}
        </header>

        <main className={`flex-1 overflow-x-hidden overflow-y-auto p-4 lg:p-6 transition-colors duration-200 ${mainBgClass}`}>
          {children}
        </main>
      </div>
    </div>
  );
};
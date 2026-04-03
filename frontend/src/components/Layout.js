import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, FileText, Users, LogOut, Menu, X, ChevronDown } from 'lucide-react';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['admin', 'analyst', 'viewer'] },
  { label: 'Records', path: '/records', icon: FileText, roles: ['admin', 'analyst'] },
  { label: 'Users', path: '/users', icon: Users, roles: ['admin'] },
];

const ROLE_COLORS = {
  admin: 'bg-moss text-white',
  analyst: 'bg-sand text-stone-800',
  viewer: 'bg-stone-200 text-stone-700',
};

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const filteredNav = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));

  const pageTitle = NAV_ITEMS.find((item) => item.path === location.pathname)?.label || 'Dashboard';

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-stone-200 flex flex-col transform transition-transform duration-200 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        data-testid="sidebar"
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-stone-200">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-sm bg-moss flex items-center justify-center">
              <span className="text-white text-xs font-bold font-heading">F</span>
            </div>
            <span className="font-heading font-semibold text-stone-800 text-lg tracking-tight">
              Fiscal
            </span>
          </div>
          <button
            className="lg:hidden text-stone-500 hover:text-stone-700"
            onClick={() => setSidebarOpen(false)}
            data-testid="sidebar-close-btn"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {filteredNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm transition-all duration-150 ${
                  isActive
                    ? 'nav-active'
                    : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50'
                }`
              }
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-stone-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm bg-stone-100 flex items-center justify-center">
              <span className="text-sm font-medium text-stone-600 font-heading">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-800 truncate">{user?.name}</p>
              <Badge className={`text-[10px] px-1.5 py-0 rounded-sm ${ROLE_COLORS[user?.role] || ''}`}>
                {user?.role}
              </Badge>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden text-stone-600 hover:text-stone-800"
              onClick={() => setSidebarOpen(true)}
              data-testid="sidebar-toggle-btn"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-heading font-semibold text-stone-800 tracking-tight">
              {pageTitle}
            </h1>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 text-sm text-stone-600 hover:text-stone-800 transition-colors" data-testid="user-menu-trigger">
                <span className="hidden sm:inline">{user?.email}</span>
                <ChevronDown size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5 text-sm">
                <p className="font-medium text-stone-800">{user?.name}</p>
                <p className="text-stone-500 text-xs">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="text-terracotta cursor-pointer"
                data-testid="logout-btn"
              >
                <LogOut size={16} className="mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

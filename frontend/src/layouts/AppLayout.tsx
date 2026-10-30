import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Sprout, Store, TrendingUp, Brain, History,
  BarChart3, FileText, Settings, Shield, LogOut, Menu, X,
  ChevronDown, Leaf,
} from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import clsx from 'clsx';

const userNav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/crops', label: 'Crops', icon: Sprout },
  { to: '/markets', label: 'Markets', icon: Store },
  { to: '/prices', label: 'Price History', icon: TrendingUp },
  { to: '/predict', label: 'Predict Price', icon: Brain },
  { to: '/predictions', label: 'My Predictions', icon: History },
  { to: '/compare', label: 'Compare Markets', icon: BarChart3 },
  { to: '/reports', label: 'Reports', icon: FileText },
];

const adminNav = [
  { to: '/admin', label: 'Admin Dashboard', icon: Shield },
  { to: '/admin/datasets', label: 'Datasets', icon: FileText },
  { to: '/admin/models', label: 'ML Models', icon: Brain },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    clsx('flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150',
      isActive
        ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900');

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-200">
        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
          <Leaf className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900 leading-none">CropCast</p>
          <p className="text-xs text-gray-500 leading-none mt-0.5">Price Prediction</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Menu</p>
        {userNav.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={navLinkClass} onClick={() => setSidebarOpen(false)}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="pt-4 pb-2">
              <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Admin</p>
            </div>
            {adminNav.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end className={navLinkClass} onClick={() => setSidebarOpen(false)}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-gray-200 p-3">
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-primary-700 font-semibold text-xs">
                {user?.username?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.profile?.display_name || user?.username}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <ChevronDown className={clsx('w-4 h-4 text-gray-400 transition-transform', profileOpen && 'rotate-180')} />
          </button>

          {profileOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
              <Link to="/profile" onClick={() => { setProfileOpen(false); setSidebarOpen(false); }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                <Settings className="w-4 h-4" /> Profile & Settings
              </Link>
              <button onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-64 flex-shrink-0 flex-col">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 w-64 flex flex-col z-50">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button onClick={() => setSidebarOpen(true)} className="p-1 rounded-lg hover:bg-gray-100">
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary-600 rounded-md flex items-center justify-center">
              <Leaf className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-900">CropCast</span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

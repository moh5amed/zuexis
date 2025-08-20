import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Upload, 
  FolderOpen, 
  Type, 
  Settings, 
  CreditCard,
  Scissors,
  Menu,
  X,
  LogOut,
  User
} from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { user, signOut } = useAuth();
  
  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Upload, label: 'Upload', path: '/upload' },
    { icon: FolderOpen, label: 'Projects', path: '/projects' },
    { icon: Type, label: 'Captions', path: '/captions' },
    { icon: Settings, label: 'Settings', path: '/settings' },
    { icon: CreditCard, label: 'Billing', path: '/billing' },
  ];

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      console.log('🚪 [Sidebar] Starting logout process...');
      
      // Clear any local storage data
      localStorage.removeItem('zuexis_user_data');
      localStorage.removeItem('zuexis_projects');
      localStorage.removeItem('zuexis_clips');
      
      // Clear session storage
      sessionStorage.clear();
      
      // Clear IndexedDB data
      try {
        const deleteRequest = indexedDB.deleteDatabase('ZuexisLocalDB');
        deleteRequest.onsuccess = () => {
          console.log('🗑️ [Sidebar] IndexedDB cleared successfully');
        };
        deleteRequest.onerror = () => {
          console.warn('⚠️ [Sidebar] Failed to clear IndexedDB');
        };
      } catch (dbError) {
        console.warn('⚠️ [Sidebar] Error clearing IndexedDB:', dbError);
      }
      
      // Sign out from Supabase
      await signOut();
      
      console.log('✅ [Sidebar] Logout successful, redirecting to landing page...');
      
      // Redirect to landing page
      navigate('/', { replace: true });
      
    } catch (error) {
      console.error('❌ [Sidebar] Logout error:', error);
      setIsLoggingOut(false);
      // Even if there's an error, try to redirect to landing page
      navigate('/', { replace: true });
    }
  };

  return (
    <>
      {/* Mobile Top Navigation Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-gray-800 border-b border-gray-700 z-50 top-nav" style={{ top: 0 }}>
        <div className="flex items-center justify-between px-4 py-3">
          {/* Brand */}
          <Link to="/dashboard" className="flex items-center space-x-2">
            <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-2 rounded-lg">
              <Scissors className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Zuexis
            </span>
          </Link>
          
          {/* Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Menu className="h-6 w-6 text-gray-300" />
          </button>
        </div>
        
        {/* Quick Navigation Tabs */}
        <div className="flex justify-around items-center px-2 pb-2">
          {navItems.slice(0, 4).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center p-2 rounded-lg transition-all duration-200 ${
                location.pathname === item.path
                  ? 'text-purple-400 bg-purple-500/10'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <item.icon className="h-4 w-4 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Mobile Full Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/80 z-50 flex items-start justify-center pt-20 mobile-menu-overlay">
          <div className="bg-gray-800 rounded-2xl p-6 w-80 max-w-[90vw] mx-4 mt-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Menu</h3>
              <button
                onClick={toggleMobileMenu}
                className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            
            {/* User Info */}
            {user && (
              <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-2 rounded-lg">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{user.email}</p>
                  </div>
                </div>
              </div>
            )}
            
            <nav>
              <ul className="space-y-2">
                {navItems.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={toggleMobileMenu}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                        location.pathname === item.path
                          ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white border border-purple-500/30'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </li>
                ))}
                
                {/* Logout Button */}
                <li className="border-t border-gray-700 pt-2 mt-4">
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to logout? This will end your session and clear all local data.')) {
                        handleLogout();
                      }
                    }}
                    disabled={isLoggingOut}
                    className="flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 text-red-400 hover:bg-red-500/10 hover:text-red-300 w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoggingOut ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-400"></div>
                    ) : (
                      <LogOut className="h-5 w-5" />
                    )}
                    <span className="font-medium">
                      {isLoggingOut ? 'Logging out...' : 'Logout'}
                    </span>
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 bg-gray-800 border-r border-gray-700 fixed top-0 left-0 h-screen fixed-sidebar">
      <div className="p-6">
        <Link to="/dashboard" className="flex items-center space-x-2">
          <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-2 rounded-lg">
            <Scissors className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Zuexis
          </span>
        </Link>
      </div>

        {/* User Info */}
        {user && (
          <div className="px-6 mb-4">
            <div className="p-3 bg-gray-700/50 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-2 rounded-lg">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{user.email}</p>
                </div>
              </div>
            </div>
          </div>
        )}

      <nav className="px-4 pb-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  location.pathname === item.path
                    ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white border border-purple-500/30'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            </li>
          ))}
            
            {/* Logout Button */}
            <li className="border-t border-gray-700 pt-2 mt-4">
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to logout? This will end your session and clear all local data.')) {
                    handleLogout();
                  }
                }}
                disabled={isLoggingOut}
                className="flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 text-red-400 hover:bg-red-500/10 hover:text-red-300 w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoggingOut ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-400"></div>
                ) : (
                  <LogOut className="h-5 w-5" />
                )}
                <span className="font-medium">
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </span>
              </button>
            </li>
        </ul>
      </nav>
    </aside>
    </>
  );
};

export default Sidebar;
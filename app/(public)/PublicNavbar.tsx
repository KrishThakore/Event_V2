'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, Grid, ChevronDown } from 'lucide-react';
import { useAuth } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import BrandMark from '@/components/BrandMark';

export default function PublicNavbar() {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user, isAuthenticated, signOut } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showProfileDropdown) {
        const target = event.target as Element;
        const dropdownContainer = document.querySelector('.profile-dropdown-container');
        if (dropdownContainer && !dropdownContainer.contains(target)) {
          setShowProfileDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileDropdown]);

  const handleLogout = async () => {
    const toastId = toast.loading('Signing out...');
    try {
      await signOut();
      toast.success('Signed out successfully', { id: toastId });
    } catch (error) {
      toast.error('Sign out failed', { id: toastId });
    }
  };

  const toggleDropdown = () => {
    setShowProfileDropdown(!showProfileDropdown);
  };

  return (
    <header className="sticky top-0 z-[100] w-full border-b border-gray-100 bg-white/70 backdrop-blur-2xl transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 sm:h-20 items-center justify-between gap-4">

          {/* Logo Section */}
          <div className="flex items-center gap-4 sm:gap-8">
            <Link href="/" className="flex items-center group transition-all duration-300">
              <BrandMark compact className="group-hover:scale-[1.02] transition-transform" subtitle="Live • Curate • Register" />
            </Link>

            {/* Main Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {[
                { name: 'Home', href: '/' },
                // { name: 'Events', href: '/events' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${pathname === item.href
                    ? "text-purple-600 bg-purple-50"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3 shrink-0">
            {mounted && isAuthenticated ? (
              <div className="relative profile-dropdown-container">
                <button
                  className="flex items-center gap-2.5 p-1.5 pr-4 rounded-2xl bg-gray-50 border border-gray-100/50 hover:bg-white hover:border-purple-200 hover:shadow-[0_10px_30px_rgba(0,0,0,0.04)] transition-all duration-500 group focus:outline-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDropdown();
                  }}
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white text-sm font-black shadow-lg shadow-purple-500/20 ring-2 ring-white">
                    {(user?.name || user?.email?.split('@')[0] || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:flex flex-col items-start leading-tight">
                    <span className="text-[13px] font-black text-gray-900 group-hover:text-purple-700 transition-colors">
                      {user?.name || user?.email?.split('@')[0] || 'User'}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400">Account Settings</span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 group-hover:text-purple-600 transition-transform duration-500 ${showProfileDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showProfileDropdown && (
                  <div
                    className="absolute -right-2 sm:right-0 top-full mt-4 w-[280px] sm:w-80 bg-white border border-gray-100 rounded-[2rem] shadow-[0_25px_80px_rgba(0,0,0,0.15)] z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 min-w-[280px]"
                  >
                    <div className="px-6 py-5 bg-gray-50/50 border-b border-gray-100">
                      <p className="text-sm font-black text-gray-900 truncate tracking-tight max-w-[200px]">{user?.name || 'User'}</p>
                      <p className="text-xs font-bold text-gray-400 truncate mt-0.5 max-w-[200px]">{user?.email}</p>
                    </div>
                    <div className="p-3 space-y-1">
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-4 px-4 py-3 text-sm font-bold text-gray-600 rounded-2xl hover:bg-purple-50 hover:text-purple-700 transition-all group/item"
                        onClick={() => setShowProfileDropdown(false)}
                      >
                        <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 group-hover/item:bg-white group-hover/item:text-purple-600 group-hover/item:shadow-md transition-all">
                          <Grid className="w-4 h-4" />
                        </div>
                        My Dashboard
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-4 w-full px-4 py-3 text-sm font-bold text-gray-600 rounded-2xl hover:bg-red-50 hover:text-red-700 transition-all group/item text-left focus:outline-none"
                      >
                        <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 group-hover/item:bg-white group-hover/item:text-red-600 group-hover/item:shadow-md transition-all">
                          <Settings className="w-4 h-4" />
                        </div>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {/* <Button variant="ghost" asChild className="rounded-2xl font-bold hidden sm:flex">
                  <Link href="/login">Login</Link>
                </Button> */}
                <Button asChild className="rounded-2xl bg-gray-900 hover:bg-black text-white px-6 font-bold shadow-xl shadow-gray-200">
                  <Link href="/login">Login</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

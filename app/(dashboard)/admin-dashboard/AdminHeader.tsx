"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Settings, Cog } from "lucide-react";
import { toast } from "sonner";
import { formatToIST } from "@/lib/date";
import Link from "next/link";

export default function AdminHeader({ userName }: { userName: string }) {
  const [currentTime, setCurrentTime] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Update time immediately and then every minute
    const updateTime = () => {
      setCurrentTime(formatToIST(new Date()));
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".profile-dropdown")) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    const toastId = toast.loading('Signing out...');
    try {
      const response = await fetch("/api/admin/logout", {
        method: "POST",
      });
 
       if (response.ok) {
        toast.success('Signed out successfully', { id: toastId });
        router.push("/admin");
      } else {
        toast.error('Logout failed', { id: toastId });
      }
    } catch (error) {
      toast.error('Logout error occurred', { id: toastId });
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-white/60 bg-gradient-to-r from-purple-50/95 via-purple-100/95 to-purple-50/95 px-4 py-4 shadow-sm backdrop-blur sm:px-6 lg:rounded-none lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Admin Workspace</p>
          <p className="truncate text-sm font-semibold text-gray-900 sm:text-base">Operational controls and event oversight</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-5">
          {/* Date/Time */}
          <span className="hidden text-sm font-medium text-gray-700 md:inline">{currentTime}</span>
          
          {/* Icons */}
          <button className="text-gray-700 hover:text-gray-900 transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          <Link href="/admin-dashboard/settings" className="text-gray-700 hover:text-gray-900 transition-colors">
            <Settings className="w-5 h-5" />
          </Link>
          
          {/* User Profile Dropdown */}
          <div className="profile-dropdown relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex max-w-[180px] items-center gap-2 rounded-full bg-white/70 px-3 py-2 hover:opacity-80 transition-opacity"
            >
              <span className="truncate text-sm font-medium text-gray-800">
                Hi, {userName || 'Admin'}
              </span>
              <span className="text-gray-500 hover:text-gray-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-md border border-gray-200 bg-white py-1 text-sm shadow-lg z-[9999]">
                <button
                  type="button"
                  className="flex w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100"
                  onClick={() => {
                    router.push("/admin-dashboard");
                    setDropdownOpen(false);
                  }}
                >
                  Dashboard
                </button>
                <button
                  type="button"
                  className="flex w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100"
                  onClick={() => {
                    router.push("/admin-dashboard/settings");
                    setDropdownOpen(false);
                  }}
                >
                  Settings
                </button>
                <button
                  type="button"
                  className="flex w-full px-4 py-2 text-left text-red-600 hover:bg-red-50"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

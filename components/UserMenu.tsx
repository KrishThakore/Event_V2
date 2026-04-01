"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-client";

export function UserMenu() {
  const { user, isAuthenticated, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const dashboardHref = user?.role === 'admin'
    ? '/admin-dashboard'
    : user?.role === 'organizer'
      ? '/organizer-dashboard'
      : user?.role === 'scanner'
        ? '/scanner-dashboard'
        : '/dashboard';

  async function handleLogout() {
    await signOut();
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:border-gray-400"
      >
        {user?.email?.[0]?.toUpperCase() ?? "U"}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-40 rounded-md border border-gray-200 bg-white py-1 text-xs shadow-lg">
          {!isAuthenticated && (
            <Link
              href="/login"
              className="block px-3 py-2 text-gray-700 hover:bg-gray-100"
              onClick={() => setOpen(false)}
            >
              Login
            </Link>
          )}
          {isAuthenticated && (
            <>
              <button
                type="button"
                className="flex w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-100"
                onClick={() => {
                  router.push(dashboardHref);
                  setOpen(false);
                }}
              >
                Dashboard
              </button>
              <button
                type="button"
                className="flex w-full px-3 py-2 text-left text-red-600 hover:bg-red-50"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

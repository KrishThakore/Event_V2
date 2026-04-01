'use client';

import { useState, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Search, Users, Calendar, Trophy, Shield, UserPlus, UserMinus, Crown, QrCode, KeyRound } from 'lucide-react';
import Pagination from '@/components/Pagination';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface UsersClientProps {
  initialUsers: any[];
  totalCount: number;
  currentPage: number;
}

export default function UsersClient({ initialUsers, totalCount, currentPage }: UsersClientProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ action: string; targetUserId: string; label: string; color: string } | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const updateFilters = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) params.delete(key);
      else params.set(key, value);
    });
    if (!updates.page) params.delete('page');
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const search = formData.get('search') as string;
    updateFilters({ search, page: null });
  };

  const handleConfirmRoleAction = (action: string, targetUserId: string, label: string, color: string) => {
    setPendingAction({ action, targetUserId, label, color });
    setConfirmOpen(true);
  };

  async function executeRoleAction() {
    if (!pendingAction) return;
    const { action, targetUserId } = pendingAction;
    setConfirmOpen(false);

    const toastId = toast.loading('Updating user role...');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, targetUserId })
      });
      if (res.ok) {
        toast.success('User role updated successfully', { id: toastId });
        router.refresh();
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Role action failed', { id: toastId });
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('An unexpected error occurred', { id: toastId });
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <Card className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              name="search"
              type="text"
              placeholder="Search by name or email..."
              defaultValue={searchParams.get('search') ?? ''}
              className="pl-12 h-12 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-purple-500/20 transition-all font-medium"
            />
            <button type="submit" className="hidden" />
          </form>
        </CardContent>
      </Card>

      {/* Results summary */}
      <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="text-gray-500 font-medium">
          Found <span className="text-gray-900 font-bold">{totalCount}</span> {totalCount === 1 ? 'user' : 'users'}
          {searchParams.get('search') && (
            <span className="ml-1 text-purple-600">matching "{searchParams.get('search')}"</span>
          )}
        </div>
      </div>

      {/* Users List */}
      <div className="grid gap-4">
        {initialUsers.length === 0 ? (
          <Card className="bg-white border-dashed border-2 border-gray-100 shadow-none rounded-3xl">
            <CardContent className="p-12">
              <div className="text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Users className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No users found
                </h3>
                <p className="text-gray-500">
                  Try adjusting your search or filters to see more results.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          initialUsers.map((user: any) => {
            const canPromoteStudentToOrganizer = user.role === 'student';
            const canPromoteStudentToScanner = user.role === 'student';
            const canPromoteScannerToOrganizer = user.role === 'scanner';
            const canPromoteOrganizerToAdmin = user.role === 'organizer';
            const canDemoteOrganizerToScanner = user.role === 'organizer';
            const canDemoteOrganizerToStudent = user.role === 'organizer';
            const canDemoteScannerToStudent = user.role === 'scanner';
            const canDemoteAdminToOrganizer = user.role === 'admin';

            return (
              <Card 
                key={user.id}
                className="group bg-white hover:shadow-xl hover:shadow-gray-100 transition-all duration-300 border border-gray-100 rounded-3xl overflow-hidden"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-gray-50 to-gray-100 border border-white flex items-center justify-center text-gray-400 shrink-0 shadow-sm rounded-2xl group-hover:scale-105 transition-transform duration-300">
                        <Users className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                            {user.full_name || 'Unnamed User'}
                          </h3>
                          <Badge className={`border-none font-bold text-[10px] px-2.5 py-0.5 rounded-full ${
                            user.role === 'admin'
                              ? 'bg-red-50 text-red-600'
                              : user.role === 'organizer'
                                ? 'bg-amber-50 text-amber-600'
                                : user.role === 'scanner'
                                  ? 'bg-blue-50 text-blue-600'
                                : 'bg-gray-50 text-gray-600'
                          }`}>
                            {user.role === 'admin' && <Crown className="w-3 h-3 mr-1" />}
                            {user.role === 'organizer' && <Shield className="w-3 h-3 mr-1" />}
                            {user.role === 'scanner' && <QrCode className="w-3 h-3 mr-1" />}
                            {user.role}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 font-medium">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            Joined {new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="grid grid-cols-3 gap-4 sm:flex sm:items-center sm:gap-6">
                        <div className="text-center group-hover:scale-110 transition-transform duration-300">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Events</p>
                          <p className="text-lg font-black text-gray-900">{user.stats.eventsCreated}</p>
                        </div>
                        <div className="text-center group-hover:scale-110 transition-transform duration-300">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Regs</p>
                          <p className="text-lg font-black text-gray-900">{user.stats.registrationsCount}</p>
                        </div>
                        <div className="text-center group-hover:scale-110 transition-transform duration-300">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Atten</p>
                          <p className="text-lg font-black text-gray-900">{user.stats.attendanceCount}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        {user.role === 'scanner' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/admin-dashboard/scanner-access?scanner=${encodeURIComponent(user.id)}`)}
                            className="w-full border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl h-9 px-4 text-[11px] font-bold transition-all active:scale-95 sm:w-auto"
                          >
                            <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                            Manage Access
                          </Button>
                        )}
                        {canPromoteStudentToScanner && (
                          <Button
                            size="sm"
                            onClick={() => handleConfirmRoleAction('promote_student_to_scanner', user.id, 'Promote to Scanner', 'bg-blue-600')}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-9 px-4 text-[11px] font-bold shadow-lg shadow-blue-100 transition-all active:scale-95 sm:w-auto"
                          >
                            <QrCode className="w-3.5 h-3.5 mr-1.5" />
                            Make Scanner
                          </Button>
                        )}
                        {canPromoteStudentToOrganizer && (
                          <Button
                            size="sm"
                            onClick={() => handleConfirmRoleAction('promote_student_to_organizer', user.id, 'Promote to Organizer', 'bg-amber-600')}
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-xl h-9 px-4 text-[11px] font-bold shadow-lg shadow-amber-100 transition-all active:scale-95 sm:w-auto"
                          >
                            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                            Make Organizer
                          </Button>
                        )}
                        {canPromoteScannerToOrganizer && (
                          <Button
                            size="sm"
                            onClick={() => handleConfirmRoleAction('promote_scanner_to_organizer', user.id, 'Promote to Organizer', 'bg-amber-600')}
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-xl h-9 px-4 text-[11px] font-bold shadow-lg shadow-amber-100 transition-all active:scale-95 sm:w-auto"
                          >
                            <Shield className="w-3.5 h-3.5 mr-1.5" />
                            Make Organizer
                          </Button>
                        )}
                        {canPromoteOrganizerToAdmin && (
                          <Button
                            size="sm"
                            onClick={() => handleConfirmRoleAction('promote_organizer_to_admin', user.id, 'Promote to Admin', 'bg-red-600')}
                            className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl h-9 px-4 text-[11px] font-bold shadow-lg shadow-red-100 transition-all active:scale-95 sm:w-auto"
                          >
                            <Crown className="w-3.5 h-3.5 mr-1.5" />
                            Make Admin
                          </Button>
                        )}
                        {canDemoteOrganizerToScanner && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleConfirmRoleAction('demote_organizer_to_scanner', user.id, 'Demote to Scanner', 'bg-gray-600')}
                            className="w-full border-gray-200 text-gray-500 hover:bg-gray-50 rounded-xl h-9 px-4 text-[11px] font-bold transition-all active:scale-95 sm:w-auto"
                          >
                            <QrCode className="w-3.5 h-3.5 mr-1.5" />
                            Scanner Only
                          </Button>
                        )}
                        {canDemoteOrganizerToStudent && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleConfirmRoleAction('demote_organizer_to_student', user.id, 'Demote to Student', 'bg-gray-600')}
                            className="w-full border-gray-200 text-gray-500 hover:bg-gray-50 rounded-xl h-9 px-4 text-[11px] font-bold transition-all active:scale-95 sm:w-auto"
                          >
                            <UserMinus className="w-3.5 h-3.5 mr-1.5" />
                            Demote
                          </Button>
                        )}
                        {canDemoteScannerToStudent && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleConfirmRoleAction('demote_scanner_to_student', user.id, 'Demote to Student', 'bg-gray-600')}
                            className="w-full border-gray-200 text-gray-500 hover:bg-gray-50 rounded-xl h-9 px-4 text-[11px] font-bold transition-all active:scale-95 sm:w-auto"
                          >
                            <UserMinus className="w-3.5 h-3.5 mr-1.5" />
                            Demote
                          </Button>
                        )}
                        {canDemoteAdminToOrganizer && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleConfirmRoleAction('demote_admin_to_organizer', user.id, 'Demote to Organizer', 'bg-gray-600')}
                            className="w-full border-gray-200 text-gray-500 hover:bg-gray-50 rounded-xl h-9 px-4 text-[11px] font-bold transition-all active:scale-95 sm:w-auto"
                          >
                            <UserMinus className="w-3.5 h-3.5 mr-1.5" />
                            Demote
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          totalItems={totalCount} 
          itemsPerPage={ITEMS_PER_PAGE}
          className="mt-8"
        />
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-white border-none shadow-2xl rounded-[2rem] max-w-[400px] p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-gray-900 tracking-tight">{pendingAction?.label}?</DialogTitle>
            <DialogDescription className="text-gray-500 pt-3 text-base font-medium leading-relaxed">
              Are you sure you want to perform this action? This will update the user's permissions immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-4 pt-8 shrink-0">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              className="flex-1 h-12 rounded-2xl border-gray-100 font-bold text-gray-600 transition-all active:scale-95 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={executeRoleAction}
              className={`flex-1 h-12 rounded-2xl text-white font-bold transition-all active:scale-95 shadow-lg ${pendingAction?.color || 'bg-purple-600'} hover:opacity-90`}
            >
              Confirm Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

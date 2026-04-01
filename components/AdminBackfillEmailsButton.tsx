"use client";

import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function AdminBackfillEmailsButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const [showConfirm, setShowConfirm] = useState(false);

  const handle = async () => {
    setShowConfirm(false);
    const toastId = toast.loading('Running backfill...');
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/backfill-emails', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Backfill failed');
      const msg = `Updated ${json.updated} profiles (attempted ${json.attempted}).`;
      setResult(msg);
      toast.success(msg, { id: toastId });
    } catch (err: any) {
      const errMsg = err?.message ?? String(err);
      setResult('Error: ' + errMsg);
      toast.error(errMsg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inline-block">
      <Button 
        onClick={() => setShowConfirm(true)} 
        disabled={loading} 
        variant="outline"
        size="sm"
        className="rounded-full bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 hover:text-white border-none disabled:opacity-60"
      >
        {loading ? 'Running…' : 'Backfill Missing Emails'}
      </Button>
      
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="bg-white border-none shadow-2xl rounded-3xl max-w-[400px] p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">Run Backfill?</DialogTitle>
            <DialogDescription className="text-gray-500 pt-2">
              Run backfill to copy emails from auth.users into profiles for missing emails? This may take a moment.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-3 pt-6 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              className="flex-1 sm:flex-none h-11 rounded-xl border-gray-100 font-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={handle}
              className="flex-1 sm:flex-none h-11 rounded-xl bg-amber-600 text-white font-medium hover:bg-amber-700"
            >
              Run Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {result && <div className="mt-2 text-xs text-gray-600 font-medium">{result}</div>}
    </div>
  );
}

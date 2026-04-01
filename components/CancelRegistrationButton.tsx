'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';

interface CancelRegistrationButtonProps {
  registrationId: string;
}

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CancelRegistrationButtonProps {
  registrationId: string;
}

export default function CancelRegistrationButton({ registrationId }: CancelRegistrationButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleCancel = async () => {
    const toastId = toast.loading('Cancelling registration...');
    setIsLoading(true);
    setIsOpen(false);

    try {
      const response = await fetch('/api/registrations/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ registrationId }),
      });

      if (!response.ok) {
        // Safely parse error — guard against HTML error pages
        const contentType = response.headers.get('content-type') ?? '';
        const message = contentType.includes('application/json')
          ? (await response.json()).error
          : `Server error (${response.status})`;
        throw new Error(message || 'Failed to cancel registration');
      }

      toast.success('Registration cancelled successfully', { id: toastId });
      router.refresh();
    } catch (error: any) {
      console.error('Error cancelling registration:', error);
      toast.error(error.message || 'Failed to cancel registration', { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)}
        disabled={isLoading}
        variant="outline" 
        className="w-full border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-100 px-6 h-12 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" />
        {isLoading ? 'Cancelling...' : 'Cancel Registration'}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-white border-none shadow-2xl rounded-3xl max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">Cancel Registration?</DialogTitle>
            <DialogDescription className="text-gray-500 pt-2">
              Are you sure you want to cancel your registration for this event? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-3 pt-6 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1 sm:flex-none h-11 rounded-xl border-gray-100 font-medium"
            >
              Go Back
            </Button>
            <Button
              onClick={handleCancel}
              className="flex-1 sm:flex-none h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium"
            >
              Yes, Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

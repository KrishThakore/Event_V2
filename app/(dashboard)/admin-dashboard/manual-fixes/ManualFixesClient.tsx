'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Users, Calendar, IndianRupee, Settings, Wrench, Plus, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const GANPAT_INSTITUTES = [
  "U. V. Patel College of Engineering", "Institute of Computer Technology", "Institute of Technology",
  "B. S. Patel Polytechnic", "Institute of Pharmacy", "Shree S. K. Patel College of Pharmaceutical Education & Research",
  "V. M. Patel College of Management Studies", "Acharya Motibhai Patel Institute of Computer Studies",
  "Mehsana Urban Institute of Sciences (MUIS)", "Department of Computer Science", "Department of Social Work",
  "Institute of Architecture", "Institute of Design & Architecture", "Kumud & Bhupesh Institute of Nursing",
  "Institute of Physiotherapy", "Kantaben Kashiram Institute of Agricultural Sciences & Research (KKIASR)",
  "Centre for Applied Sciences & Technology", "Japan–India Institute for Manufacturing (JIM)",
  "Centre for Advanced Research Studies (CARS)"
];

export default function ManualFixesClient({ suspiciousPayments, events }: { suspiciousPayments: any[], events: any[] }) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const router = useRouter();

  const handleAction = async (formData: FormData) => {
    const action = formData.get('action') as string;
    const toastId = toast.loading('Processing manual fix...');
    setLoadingAction(action);

    try {
      const data: Record<string, string> = {};
      formData.forEach((value, key) => {
        data[key] = value as string;
      });

      const response = await fetch('/api/admin/manual-fixes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Action failed');
      }

      toast.success('Manual fix applied successfully', { id: toastId });
      router.refresh();
    } catch (error: any) {
      console.error('Manual fix error:', error);
      toast.error(error.message || 'Action failed', { id: toastId });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Suspicious Payments</CardTitle>
          <CardDescription>Payment success but registration missing issues</CardDescription>
        </CardHeader>
        <CardContent>
          {suspiciousPayments.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <IndianRupee className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No suspicious payments found</h3>
              <p className="text-gray-500">All payments have proper registrations.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {suspiciousPayments.map((payment: any) => (
                <Card key={payment.id} className="border-red-200 bg-red-50 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <IndianRupee className="w-5 h-5 text-red-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">₹{Number(payment.amount)}</h3>
                            <p className="text-sm text-gray-600">{payment.registration?.event?.title ?? 'Event'} · {payment.registration?.user?.full_name ?? 'Unknown'} ({payment.registration?.user?.email})</p>
                          </div>
                          <div className="flex gap-2">
                            <Badge className="bg-green-100 text-green-800 border-green-200">SUCCESS</Badge>
                            <Badge className="bg-red-100 text-red-800 border-red-200">Missing Registration</Badge>
                          </div>
                        </div>
                        <div className="space-y-1 text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Created: {new Date(payment.created_at!).toLocaleString('en-US', { hour12: true })}
                          </div>
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Payment ID: {payment.razorpay_payment_id ?? 'N/A'}
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <form action={handleAction}>
                          <input type="hidden" name="paymentId" value={payment.id} />
                          <input type="hidden" name="action" value="fix_payment_success_but_registration_missing" />
                          <Button 
                            type="submit" 
                            disabled={loadingAction !== null}
                            size="sm" 
                            className="bg-amber-600 text-white hover:bg-amber-700"
                          >
                            <Wrench className="w-3 h-3 mr-1" />
                            Fix Registration
                          </Button>
                        </form>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Add User Manually (Internet Failed)</CardTitle>
          <CardDescription>Create manual registration for users who paid but internet failed</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleAction} className="space-y-4">
            <input type="hidden" name="action" value="add_user_manually" />
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">User Email</label>
                <Input type="email" name="userEmail" required placeholder="user@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Event</label>
                <Select name="eventId" required>
                  <SelectTrigger className="w-full border-gray-300 rounded-lg bg-white text-black">
                    <SelectValue placeholder="Select event" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg">
                    {events.map(event => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.title} ({new Date(event.event_date).toLocaleDateString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button 
              type="submit" 
              disabled={loadingAction !== null}
              className="bg-purple-600 text-white hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add User Manually
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-white border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" />Add Offline Registration</CardTitle>
          <CardDescription>Create new user profile and manual registration for offline participants</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleAction} className="space-y-4">
            <input type="hidden" name="action" value="add_offline_registration" />
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <Input type="text" name="offlineUserName" required placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <Input type="email" name="offlineUserEmail" required placeholder="user@example.com" />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <Input type="tel" name="offlinePhoneNumber" required placeholder="Enter phone number" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">University</label>
                <Select name="offlineUniversityType" required>
                  <SelectTrigger className="w-full border-gray-300 rounded-lg bg-white text-black">
                    <SelectValue placeholder="Select University" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg">
                    <SelectItem value="Partner Institution">Partner Institution</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Partner Institution (if applicable)</label>
                <Select name="offlineGanpatInstitute">
                  <SelectTrigger className="w-full border-gray-300 rounded-lg bg-white text-black">
                    <SelectValue placeholder="Select Institute" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {GANPAT_INSTITUTES.map(inst => <SelectItem key={inst} value={inst}>{inst}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Other University Name (if applicable)</label>
                <Input type="text" name="offlineOtherUniversity" placeholder="Enter university name" minLength={3} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Event</label>
              <Select name="offlineEventId" required>
                <SelectTrigger className="w-full border-gray-300 rounded-lg bg-white text-black">
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg">
                  {events.map(event => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.title} ({new Date(event.event_date).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              type="submit" 
              disabled={loadingAction !== null}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Offline Registration
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Settings, AlertTriangle } from 'lucide-react';
import FormControlClient from './FormControlClient';

export const revalidate = 0;

export default async function AdminFormControlPage({ searchParams }: { searchParams: { event?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') redirect('/admin');

  const events = await prisma.events.findMany({
    where: { status: 'approved' },
    select: { 
      id: true, 
      title: true, 
      status: true, 
      form_fields: { 
        select: { 
          id: true, 
          label: true, 
          field_type: true, 
          required: true, 
          options: true, 
          disabled: true, 
          disabled_by: true, 
          disabled_at: true, 
          overridden_by: true, 
          overridden_at: true, 
          original_required: true 
        }, 
        orderBy: { created_at: 'asc' } 
      } 
    },
    orderBy: { title: 'asc' }
  });

  const selectedEventId = searchParams?.event;
  const selectedEvent = events.find(e => e.id === selectedEventId) ?? events[0];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Form Control</h1>
          <p className="mt-1 text-sm text-gray-500">View and manage registration form fields and override organizer configurations.</p>
        </div>
      </div>

      <Card className="bg-white border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" />Select Event</CardTitle>
          <CardDescription>Choose an event to manage its registration form fields</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3">
            <div className="w-full max-w-xs">
              <Select name="event" defaultValue={selectedEvent?.id ?? ''}>
                <SelectTrigger className="w-full border-gray-300 rounded-lg bg-white text-black"><SelectValue placeholder="Select event" /></SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg">
                  {events.map(event => <SelectItem key={event.id} value={event.id}>{event.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="bg-purple-600 text-white hover:bg-purple-700">View Form Fields</Button>
          </form>
        </CardContent>
      </Card>

      {!selectedEvent ? (
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-12 text-center text-gray-500">
            No approved events found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="bg-white border border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center"><Shield className="w-5 h-5 text-purple-600" /></div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedEvent.title}</h2>
                  <p className="text-sm text-gray-500">Configuration panel for registration fields</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <FormControlClient selectedEvent={selectedEvent} />

          <Card className="bg-blue-50 border border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0"><AlertTriangle className="w-4 h-4 text-blue-600" /></div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Form Control Guidelines:</h4>
                  <ul className="space-y-1 text-sm text-gray-600 list-disc list-inside">
                    <li><strong>Disable Field:</strong> Prevent users from filling potentially unsafe fields</li>
                    <li><strong>Make Required:</strong> Override organizer settings to ensure critical data collection</li>
                    <li><strong>Enable/Remove Override:</strong> Revert to original organizer configuration</li>
                    <li>All actions are logged with full audit trail for accountability</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

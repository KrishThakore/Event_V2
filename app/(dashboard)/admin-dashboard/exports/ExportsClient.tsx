'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Users, Calendar, IndianRupee, FileText, Settings, Database } from 'lucide-react';
import { toast } from 'sonner';

interface ExportsClientProps {
  events: any[];
}

export default function ExportsClient({ events }: ExportsClientProps) {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleExport = async (e: React.FormEvent<HTMLFormElement>, type: string) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const toastId = toast.loading(`Generating ${type.replace(/_/g, ' ')} export...`);
    setDownloading(type);

    try {
      const response = await fetch('/api/admin/exports', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to generate export');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `export-${type}-${new Date().toISOString().split('T')[0]}.csv`;
      if (contentDisposition && contentDisposition.indexOf('attachment') !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(contentDisposition);
        if (matches != null && matches[1]) { 
          filename = matches[1].replace(/['"]/g, '');
        }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Export downloaded successfully', { id: toastId });
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || 'Failed to download export', { id: toastId });
    } finally {
      setDownloading(null);
    }
  };

  const exportCards = [
    { type: 'registrations', icon: Users, label: 'Registrations', desc: 'Export all registrations with user and event details.', bgColor: 'bg-blue-100', textColor: 'text-blue-600', btnColor: 'bg-blue-600 hover:bg-blue-700' },
    { type: 'attendance', icon: Calendar, label: 'Attendance', desc: 'Export attendance records with check-in times and who scanned each entry.', bgColor: 'bg-green-100', textColor: 'text-green-600', btnColor: 'bg-green-600 hover:bg-green-700' },
    { type: 'manual_registrations', icon: Settings, label: 'Manual Registrations', desc: 'Export only manually created registrations.', bgColor: 'bg-amber-100', textColor: 'text-amber-600', btnColor: 'bg-amber-600 hover:bg-amber-700' },
    { type: 'payments', icon: IndianRupee, label: 'Payments', desc: 'Export all payment records with Razorpay details.', bgColor: 'bg-purple-100', textColor: 'text-purple-600', btnColor: 'bg-purple-600 hover:bg-purple-700' },
    { type: 'users', icon: Database, label: 'Users', desc: 'Export all user profiles with roles.', bgColor: 'bg-indigo-100', textColor: 'text-indigo-600', btnColor: 'bg-indigo-600 hover:bg-indigo-700' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {exportCards.map(({ type, icon: Icon, label, desc, bgColor, textColor, btnColor }) => (
        <Card key={type} className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <form onSubmit={(e) => handleExport(e, type)} className="space-y-4">
              <input type="hidden" name="exportType" value={type} />
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${bgColor} rounded-full flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${textColor}`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{label}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{desc}</p>
                </div>
              </div>
              <Button 
                type="submit" 
                disabled={downloading !== null}
                className={`w-full text-white ${btnColor}`}
              >
                {downloading === type ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Exporting...
                  </span>
                ) : (
                  <><Download className="w-4 h-4 mr-2" />Export CSV</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      ))}

      <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <form onSubmit={(e) => handleExport(e, 'event_detailed')} className="space-y-4">
            <input type="hidden" name="exportType" value="event_detailed" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Event Detailed Export</h3>
                <p className="text-sm text-gray-600">Export registrations, custom fields, payments, and attendance scanner details.</p>
              </div>
            </div>
            <Select name="eventId" defaultValue={events[0]?.id ?? ''}>
              <SelectTrigger className="w-full border-gray-300 rounded-lg bg-white text-black">
                <SelectValue placeholder="Select event" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg">
                <SelectItem value="all">All Events</SelectItem>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.title}{event.event_date ? ` • ${new Date(event.event_date).toLocaleDateString()}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              type="submit" 
              disabled={downloading !== null}
              className="w-full bg-red-600 text-white hover:bg-red-700"
            >
              {downloading === 'event_detailed' ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Exporting...
                </span>
              ) : (
                <><Download className="w-4 h-4 mr-2" />Export Event CSV</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

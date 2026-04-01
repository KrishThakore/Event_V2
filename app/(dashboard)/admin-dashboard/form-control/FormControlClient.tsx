'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Lock, Unlock, Crown, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface FormControlClientProps {
  selectedEvent: any;
}

export default function FormControlClient({ selectedEvent }: FormControlClientProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const router = useRouter();

  const handleAction = async (fieldId: string, action: string) => {
    const actionKey = `${fieldId}-${action}`;
    const toastId = toast.loading('Processing request...');
    setLoadingAction(actionKey);

    try {
      const response = await fetch('/api/admin/form-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: selectedEvent.id, fieldId, action }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update form field');

      toast.success('Field updated successfully', { id: toastId });
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong', { id: toastId });
    } finally {
      setLoadingAction(null);
    }
  };

  if (!selectedEvent.form_fields || selectedEvent.form_fields.length === 0) {
    return (
      <Card className="bg-white border border-gray-200">
        <CardContent className="p-12 text-center text-gray-500">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Custom Fields</h3>
          <p>No custom registration fields configured for this event.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-900">Registration Fields</h3>
        <Badge variant="outline">{selectedEvent.form_fields.length} fields</Badge>
      </div>
      {selectedEvent.form_fields.map((field: any) => {
        const isDisabling = loadingAction === `${field.id}-disable_field`;
        const isEnabling = loadingAction === `${field.id}-enable_field`;
        const isOverriding = loadingAction === `${field.id}-override_field_required`;
        const isRemovingOverride = loadingAction === `${field.id}-remove_field_override`;

        return (
          <Card key={field.id} className={`bg-white hover:shadow-md transition-shadow ${field.disabled ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center flex-wrap gap-2 mb-2">
                    <h4 className="text-lg font-semibold text-gray-900">{field.label}</h4>
                    <Badge variant="secondary">{field.field_type}</Badge>
                    {field.required && <Badge className="bg-red-100 text-red-800 border-red-200">REQUIRED</Badge>}
                    {field.disabled && <Badge className="bg-red-100 text-red-800 border-red-200 flex items-center gap-1"><Lock className="w-3 h-3" />DISABLED</Badge>}
                    {field.overridden_by && <Badge className="bg-amber-100 text-amber-800 border-amber-200 flex items-center gap-1"><Crown className="w-3 h-3" />OVERRIDDEN</Badge>}
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    {field.options && field.options.length > 0 && <div><span className="font-medium">Options:</span> {(field.options as string[]).join(', ')}</div>}
                    <div className="text-xs text-gray-500">
                      ID: {field.id.slice(0, 8)}...
                      {field.disabled && field.disabled_at && ` · Disabled at ${new Date(field.disabled_at).toLocaleString()}`}
                      {field.overridden_by && field.overridden_at && ` · Overridden at ${new Date(field.overridden_at).toLocaleString()}`}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 ml-4">
                  {field.disabled ? (
                    <Button 
                      onClick={() => handleAction(field.id, 'enable_field')} 
                      disabled={!!loadingAction}
                      size="sm" className="bg-green-600 text-white hover:bg-green-700"
                    >
                      {isEnabling ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div> : <Unlock className="w-3 h-3 mr-1" />}
                      Enable
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => handleAction(field.id, 'disable_field')} 
                      disabled={!!loadingAction}
                      size="sm" className="bg-red-600 text-white hover:bg-red-700"
                    >
                      {isDisabling ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div> : <Lock className="w-3 h-3 mr-1" />}
                      Disable
                    </Button>
                  )}
                  {!field.required && !field.overridden_by && (
                    <Button 
                      onClick={() => handleAction(field.id, 'override_field_required')} 
                      disabled={!!loadingAction}
                      size="sm" className="bg-amber-600 text-white hover:bg-amber-700"
                    >
                      {isOverriding ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div> : <Crown className="w-3 h-3 mr-1" />}
                      Make Required
                    </Button>
                  )}
                  {field.overridden_by && (
                    <Button 
                      onClick={() => handleAction(field.id, 'remove_field_override')} 
                      disabled={!!loadingAction}
                      size="sm" variant="outline"
                    >
                      {isRemovingOverride ? <div className="w-3 h-3 border-purple-600 border-t-transparent rounded-full animate-spin mr-1"></div> : <AlertTriangle className="w-3 h-3 mr-1" />}
                      Remove Override
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

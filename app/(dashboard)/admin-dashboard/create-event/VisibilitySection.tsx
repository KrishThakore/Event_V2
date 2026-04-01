'use client';

import { useCreateEvent } from './CreateEventProvider';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export function VisibilitySection({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const { state, updateField } = useCreateEvent();
  const isLight = variant === 'light';

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h3 className={isLight ? 'mb-2 text-sm font-medium text-gray-900' : 'mb-2 text-sm font-medium text-white'}>Visibility</h3>
          <RadioGroup
            value={state.data.visibility}
            onValueChange={(value: 'public' | 'hidden') => updateField('visibility', value)}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="public" id="public" />
              <Label htmlFor="public" className={isLight ? 'text-gray-700' : ''}>Public (visible to users)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="hidden" id="hidden" />
              <Label htmlFor="hidden" className={isLight ? 'text-gray-700' : ''}>Hidden (admin-only)</Label>
            </div>
          </RadioGroup>
        </div>

        <div>
          <h3 className={isLight ? 'mb-2 text-sm font-medium text-gray-900' : 'mb-2 text-sm font-medium text-white'}>Save Mode</h3>
          <RadioGroup
            value={state.data.save_mode}
            onValueChange={(value: 'publish' | 'draft') => updateField('save_mode', value)}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="publish" id="publish" />
              <Label htmlFor="publish" className={isLight ? 'text-gray-700' : ''}>Publish now</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="draft" id="draft" />
              <Label htmlFor="draft" className={isLight ? 'text-gray-700' : ''}>Save as draft</Label>
            </div>
          </RadioGroup>
        </div>
      </div>
    </div>
  );
}

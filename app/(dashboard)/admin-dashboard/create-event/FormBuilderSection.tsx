'use client';

import { useState } from 'react';
import { useCreateEvent } from './CreateEventProvider';
import { v4 as uuidv4 } from 'uuid';

type FieldType = 'text' | 'number' | 'select' | 'file' | 'checkbox' | 'radio' | 'textarea';

interface FormFieldEditorProps {
  field: {
    id: string;
    label: string;
    field_type: FieldType;
    required: boolean;
    options?: string[];
    disabled?: boolean;
    original_required?: boolean;
    condition?: {
      field_id: string;
      value: string;
    };
  };
  index: number;
  total: number;
  allFields: Array<{
    id: string;
    label: string;
    field_type: FieldType;
    options?: string[];
  }>;
  onUpdate: (id: string, updates: any) => void;
  onRemove: (id: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const FormFieldEditor = ({ field, index, total, allFields, onUpdate, onRemove, onMoveUp, onMoveDown, variant }: FormFieldEditorProps & { variant?: 'dark' | 'light' }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showConditionEditor, setShowConditionEditor] = useState(!!field.condition);
  const isLight = variant === 'light';
  const headerBg = isLight ? 'p-3 bg-white/0 cursor-pointer' : 'p-3 bg-slate-800/50 cursor-pointer';
  const containerBg = isLight ? 'border border-gray-200 rounded-lg overflow-hidden bg-white mb-4' : 'border border-slate-700 rounded-lg overflow-hidden bg-slate-800/50 mb-4';
  const inputBase = isLight
    ? 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500'
    : 'w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500';

  const handleTypeChange = (newType: FieldType) => {
    const updates: any = { field_type: newType };
    if (newType !== 'select' && newType !== 'checkbox' && newType !== 'radio') {
      updates.options = undefined;
    } else if (!field.options) {
      updates.options = [];
    }
    onUpdate(field.id, updates);
  };

  return (
    <div className={containerBg}>
      <div 
        className={headerBg}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <span className={isLight ? 'text-gray-500' : 'text-slate-400'}>
            {isExpanded ? '▼' : '►'}
          </span>
          <span className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{field.label || 'Untitled Field'}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${isLight ? 'bg-gray-100 text-gray-700' : 'bg-slate-700 text-slate-300'}`}>
            {field.field_type}
          </span>
          {field.required && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${isLight ? 'bg-red-100 text-red-700' : 'bg-red-900/50 text-red-300'}`}>
              Required
            </span>
          )}
          {field.condition && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${isLight ? 'bg-amber-100 text-amber-700' : 'bg-amber-900/50 text-amber-300'}`}>
              Conditional
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            disabled={index === 0}
            className={isLight ? 'text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed' : 'text-slate-500 hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed'}
            aria-label="Move field up"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            disabled={index === total - 1}
            className={isLight ? 'text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed' : 'text-slate-500 hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed'}
            aria-label="Move field down"
          >
            ▼
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(field.id);
            }}
            className={isLight ? 'text-gray-500 hover:text-red-600' : 'text-slate-400 hover:text-red-400'}
            aria-label="Remove field"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="p-4 space-y-4">
          <div>
            <label className={`block text-sm font-medium ${isLight ? 'text-gray-700 mb-1' : 'text-slate-300 mb-1'}`}>
              Field Label <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={field.label}
              onChange={(e) => onUpdate(field.id, { label: e.target.value })}
              className={inputBase}
              placeholder="e.g., Phone Number, Company Name"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium ${isLight ? 'text-gray-700 mb-1' : 'text-slate-300 mb-1'}`}>
              Field Type
            </label>
            <select
              value={field.field_type}
              onChange={(e) => handleTypeChange(e.target.value as FieldType)}
              className={isLight ? 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-500' : 'w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500'}
            >
              <option value="text">Text</option>
              <option value="textarea">Textarea (Long Text)</option>
              <option value="number">Number</option>
              <option value="select">Dropdown</option>
              <option value="checkbox">Checkbox (Multi-select)</option>
              <option value="radio">Radio (Single-select)</option>
              <option value="file">File Upload</option>
            </select>
          </div>

          {(field.field_type === 'select' || field.field_type === 'checkbox' || field.field_type === 'radio') && (
            <div>
              <label className={`block text-sm font-medium ${isLight ? 'text-gray-700 mb-2' : 'text-slate-300 mb-2'}`}>
                {field.field_type === 'select' ? 'Dropdown Options' : field.field_type === 'checkbox' ? 'Checkbox Options' : 'Radio Options'}
              </label>
              <div className="space-y-2">
                {field.options?.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...(field.options || [])];
                        newOptions[index] = e.target.value;
                        onUpdate(field.id, { options: newOptions });
                      }}
                      className={inputBase}
                      placeholder={`Option ${index + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newOptions = field.options?.filter((_, i) => i !== index) || [];
                        onUpdate(field.id, { options: newOptions });
                      }}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                      aria-label="Remove option"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const currentOptions = field.options || [];
                    const newOptionNumber = currentOptions.length + 1;
                    const newOptions = [...currentOptions, `Option ${newOptionNumber}`];
                    onUpdate(field.id, { options: newOptions });
                  }}
                  className={isLight ? 'w-full rounded-lg border border-dashed border-purple-300 bg-white px-3 py-2 text-sm text-purple-700 hover:border-purple-500 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors' : 'w-full rounded-lg border border-dashed border-slate-600 bg-slate-800/50 px-3 py-2 text-sm text-slate-300 hover:border-sky-500 hover:text-sky-300 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors'}
                >
                  <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add option
                </button>
              </div>
              <p className={`mt-2 text-xs ${isLight ? 'text-gray-500' : 'text-slate-400'}`}>
                {field.field_type === 'select'
                  ? 'Add options for the dropdown menu. Each option will be available for selection during registration.'
                  : field.field_type === 'checkbox'
                  ? 'Add options that attendees can select multiple of during registration.'
                  : 'Add options for the radio group. Attendees can select exactly one option.'}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center">
              <input
                id={`required-${field.id}`}
                type="checkbox"
                checked={field.required}
                onChange={(e) => {
                  const newRequired = e.target.checked;
                  const updates: any = { required: newRequired };
                  if (typeof field.original_required !== 'boolean') {
                    updates.original_required = field.required;
                  }
                  onUpdate(field.id, updates);
                }}
                className={isLight ? 'h-4 w-4 rounded border-gray-300 bg-white text-purple-600 focus:ring-purple-500' : 'h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500'}
              />
              <label
                htmlFor={`required-${field.id}`}
                className={isLight ? 'ml-2 block text-sm text-gray-700' : 'ml-2 block text-sm text-slate-300'}
              >
                Required field
              </label>
            </div>

            <div className={isLight ? 'flex flex-wrap items-center gap-3 text-xs text-gray-700' : 'flex flex-wrap items-center gap-3 text-xs text-slate-300'}>
              <button
                type="button"
                className={isLight ? 'rounded border border-gray-300 px-2 py-1 hover:border-purple-500 hover:text-purple-700 text-gray-700' : 'rounded border border-slate-600 px-2 py-1 hover:border-sky-500 hover:text-sky-300'}
                onClick={() => {
                  const updates: any = {};
                  if (typeof field.original_required !== 'boolean') {
                    updates.original_required = field.required;
                    updates.required = !field.required;
                  } else {
                    updates.required = !field.required;
                  }
                  onUpdate(field.id, updates);
                }}
              >
                Override required
              </button>

              {typeof field.original_required === 'boolean' && field.required !== field.original_required && (
                <button
                  type="button"
                  className={isLight ? 'rounded border border-purple-600 px-2 py-1 text-purple-700 hover:bg-purple-50' : 'rounded border border-emerald-600 px-2 py-1 text-emerald-200 hover:bg-emerald-900/40'}
                  onClick={() => onUpdate(field.id, { required: field.original_required })}
                >
                  Restore original required
                </button>
              )}

              <div className="flex items-center">
                <input
                  id={`disabled-${field.id}`}
                  type="checkbox"
                  checked={!!field.disabled}
                  onChange={(e) => onUpdate(field.id, { disabled: e.target.checked })}
                  className={isLight ? 'h-4 w-4 rounded border-gray-300 bg-white text-red-500 focus:ring-red-500' : 'h-4 w-4 rounded border-slate-600 bg-slate-800 text-red-500 focus:ring-red-500'}
                />
                <label
                  htmlFor={`disabled-${field.id}`}
                  className={isLight ? 'ml-2 block text-sm text-gray-700' : 'ml-2 block text-sm text-slate-300'}
                >
                  Disable field
                </label>
              </div>
            </div>
          </div>

          {/* Conditional Logic Section */}
          <div className={`rounded-lg border p-3 ${isLight ? 'border-gray-200 bg-gray-50' : 'border-slate-700 bg-slate-800/30'}`}>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showConditionEditor}
                  onChange={(e) => {
                    setShowConditionEditor(e.target.checked);
                    if (!e.target.checked) {
                      onUpdate(field.id, { condition: undefined });
                    }
                  }}
                  className={isLight ? 'h-4 w-4 rounded border-gray-300 bg-white text-amber-500 focus:ring-amber-500' : 'h-4 w-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500'}
                />
                <span className={`text-sm font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  Conditional Visibility
                </span>
              </label>
              {field.condition && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowConditionEditor(false);
                    onUpdate(field.id, { condition: undefined });
                  }}
                  className={`text-xs px-2 py-0.5 rounded ${isLight ? 'text-red-600 hover:bg-red-50' : 'text-red-400 hover:bg-red-900/30'}`}
                >
                  Clear
                </button>
              )}
            </div>
            <p className={`text-xs mb-3 ${isLight ? 'text-gray-500' : 'text-slate-400'}`}>
              Show this field only when another field has a specific value
            </p>

            {showConditionEditor && (() => {
              // Only fields that come before this one and have options (select/radio/checkbox)
              const eligibleParents = allFields.filter((f, i) => 
                i < index && 
                f.id !== field.id && 
                (f.field_type === 'select' || f.field_type === 'radio' || f.field_type === 'checkbox') &&
                f.options && f.options.length > 0
              );

              const selectedParent = eligibleParents.find(f => f.id === field.condition?.field_id);
              const parentOptions = selectedParent?.options || [];

              return (
                <div className="space-y-3">
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-slate-300'}`}>
                      When this field equals…
                    </label>
                    {eligibleParents.length === 0 ? (
                      <p className={`text-xs italic ${isLight ? 'text-gray-400' : 'text-slate-500'}`}>
                        No eligible parent fields found. Add a Dropdown, Radio, or Checkbox field above this one first.
                      </p>
                    ) : (
                      <select
                        value={field.condition?.field_id || ''}
                        onChange={(e) => {
                          const parentId = e.target.value;
                          if (parentId) {
                            onUpdate(field.id, { condition: { field_id: parentId, value: '' } });
                          } else {
                            onUpdate(field.id, { condition: undefined });
                          }
                        }}
                        className={isLight 
                          ? 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500'
                          : 'w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500'}
                      >
                        <option value="">Select parent field…</option>
                        {eligibleParents.map(parent => (
                          <option key={parent.id} value={parent.id}>
                            {parent.label || 'Untitled Field'}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {field.condition?.field_id && parentOptions.length > 0 && (
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-slate-300'}`}>
                        …has this value:
                      </label>
                      <select
                        value={field.condition?.value || ''}
                        onChange={(e) => {
                          onUpdate(field.id, { 
                            condition: { 
                              field_id: field.condition!.field_id, 
                              value: e.target.value 
                            } 
                          });
                        }}
                        className={isLight 
                          ? 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500'
                          : 'w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500'}
                      >
                        <option value="">Select trigger value…</option>
                        {parentOptions.map((opt, i) => (
                          <option key={i} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {field.condition?.field_id && field.condition?.value && (
                    <div className={`text-xs p-2 rounded ${isLight ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-amber-900/20 text-amber-300 border border-amber-800/50'}`}>
                      ✓ This field will only show when <strong>"{selectedParent?.label}"</strong> = <strong>"{field.condition.value}"</strong>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export function FormBuilderSection({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const { state, addFormField, updateFormField, removeFormField, moveFormField } = useCreateEvent();
  const isLight = variant === 'light';
  const headerBorder = isLight ? 'border-b border-gray-200 pb-2' : 'border-b border-slate-700 pb-2';
  const headerTitle = isLight ? 'text-lg font-semibold text-gray-900' : 'text-lg font-semibold text-white';
  const headerDesc = isLight ? 'text-sm text-gray-600' : 'text-sm text-slate-400';
  
  const defaultFields = [
    {
      id: 'full_name',
      label: 'Full Name',
      field_type: 'text' as const,
      required: true,
      disabled: true,
      disabled_by: 'system',
    },
    {
      id: 'email',
      label: 'Email',
      field_type: 'text' as const,
      required: true,
      disabled: true,
      disabled_by: 'system',
    },
    {
      id: 'phone_number',
      label: 'Phone Number',
      field_type: 'text' as const,
      required: true,
      disabled: true,
      disabled_by: 'system',
    },
    {
      id: 'university',
      label: 'University',
      field_type: 'text' as const,
      required: true,
      disabled: true,
      disabled_by: 'system',
    },
  ];

  const handleAddField = () => {
    const newField = {
      id: uuidv4(),
      label: '',
      field_type: 'text' as const,
      required: false,
    };
    addFormField(newField);
  };

  const handleUpdateField = (id: string, updates: any) => {
    updateFormField(id, updates);
  };

  const handleRemoveField = (id: string) => {
    removeFormField(id);
  };

  return (
    <div className="space-y-4">
      <div className={headerBorder}>
        <h2 className={headerTitle}>Registration Form Builder</h2>
        <p className={headerDesc}>
          Customize the registration form with additional fields
        </p>
      </div>

      <div className="space-y-4">
        <div className={isLight ? 'rounded-lg border border-gray-200 bg-white p-4' : 'rounded-lg border border-slate-700 bg-slate-800/30 p-4'}>
          <h3 className={isLight ? 'text-sm font-medium text-gray-900 mb-2' : 'text-sm font-medium text-white mb-2'}>Default Fields</h3>
          <p className={isLight ? 'text-xs text-gray-600 mb-3' : 'text-xs text-slate-400 mb-3'}>
            These fields are included by default and cannot be removed or modified
          </p>
          
          <div className="space-y-2">
            {defaultFields.map((field) => (
              <div key={field.id} className={isLight ? 'flex items-center justify-between p-2 bg-white/0 rounded' : 'flex items-center justify-between p-2 bg-slate-800/50 rounded'}>
                <div className="flex items-center space-x-2">
                  <span className={isLight ? 'text-gray-900' : 'text-white'}>{field.label}</span>
                  <span className={isLight ? 'text-xs px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded' : 'text-xs px-1.5 py-0.5 bg-slate-700 text-slate-300 rounded'}>
                    {field.field_type}
                  </span>
                  {field.required && (
                    <span className={isLight ? 'text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded' : 'text-xs px-1.5 py-0.5 bg-red-900/30 text-red-300 rounded'}>
                      Required
                    </span>
                  )}
                </div>
                <span className={isLight ? 'text-xs text-gray-500' : 'text-xs text-slate-500'}>System field</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className={isLight ? 'text-sm font-medium text-gray-900' : 'text-sm font-medium text-white'}>Custom Fields</h3>
            <button
              type="button"
              onClick={handleAddField}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              <svg className="-ml-0.5 mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Field
            </button>
          </div>

          {state.data.form_fields.length === 0 ? (
            <div className={isLight ? 'text-center py-8 border-2 border-dashed border-gray-300 rounded-lg' : 'text-center py-8 border-2 border-dashed border-slate-700 rounded-lg'}>
              <svg
                className={isLight ? 'mx-auto h-12 w-12 text-gray-400' : 'mx-auto h-12 w-12 text-slate-500'}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className={isLight ? 'mt-2 text-sm font-medium text-gray-900' : 'mt-2 text-sm font-medium text-white'}>No custom fields</h3>
              <p className={isLight ? 'mt-1 text-sm text-gray-600' : 'mt-1 text-sm text-slate-400'}>
                Add custom fields to collect additional information from attendees.
              </p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleAddField}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add your first field
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {state.data.form_fields.map((field, index) => (
                <FormFieldEditor
                  key={field.id}
                  field={field}
                  index={index}
                  total={state.data.form_fields.length}
                  onUpdate={handleUpdateField}
                  onRemove={handleRemoveField}
                  onMoveUp={() => moveFormField(index, index - 1)}
                  onMoveDown={() => moveFormField(index, index + 1)}
                  variant={variant}
                  allFields={state.data.form_fields}
                />
              ))}
              
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleAddField}
                  className={isLight ? 'inline-flex items-center px-4 py-2 border border-dashed border-gray-300 rounded-md shadow-sm text-sm font-medium text-purple-700 bg-white hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500' : 'inline-flex items-center px-4 py-2 border border-dashed border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-300 bg-slate-800/50 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500'}>
                  <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Another Field
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

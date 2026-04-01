'use client';

import { createContext, useContext, useReducer, ReactNode, useEffect, useCallback } from 'react';

// Types
export interface FormField {
  id: string;
  label: string;
  field_type: 'text' | 'number' | 'select' | 'file' | 'checkbox' | 'radio' | 'textarea';
  required: boolean;
  options?: string[];
  disabled?: boolean;
  disabled_by?: string;
  disabled_at?: string;
  overridden_by?: string;
  overridden_at?: string;
  original_required?: boolean;
  condition?: {
    field_id: string;
    value: string;
  };
}

export interface RegionLabel {
  id: string;
  label: string;
  currency: 'INR' | 'USD';
}

export interface PricingOption {
  id: string;
  label: string;
  price: number;
  currency: string;
  price_inr?: number;
  price_usd?: number;
}

export interface EventData {
  // Section 1: Event Basics
  title: string;
  description: string;
  location: string;
  event_date: string;
  start_time: string;
  end_time: string;
  image_url?: string | null;
  
  // Section 2: Capacity & Registration
  total_capacity: number;
  is_unlimited_capacity: boolean;
  show_capacity: boolean;
  registration_status: 'open' | 'closed';
  auto_close_when_full: boolean;
  
  // Section 3: Pricing & Payment
  event_type: 'free' | 'paid' | 'custom';
  price: number;
  price_inr: number;
  price_usd: number;
  currency: string;
  qfix_link: string;
  use_custom_qfix_link: boolean;
  pricing_dropdown_label?: string;
  pricing_options: PricingOption[];
  
  // Section 4: Form Builder
  form_fields: FormField[];
  
  // Section 5: Visibility & Publishing
  visibility: 'public' | 'hidden';
  save_mode: 'publish' | 'draft';
  
  // Section 6: Organizer Assignment
  assigned_organizer: string | null;
  use_dual_region_pricing: boolean;
  dual_region_label: string;
  region_labels: RegionLabel[];
}

interface EventState {
  data: EventData;
  errors: Record<string, string>;
  isSubmitting: boolean;
  showConfirmation: boolean;
}

type EventAction =
  | { type: 'UPDATE_FIELD'; field: keyof EventData; value: any }
  | { type: 'SET_ERROR'; field: string; error: string }
  | { type: 'CLEAR_ERROR'; field: string }
  | { type: 'SET_SUBMITTING'; isSubmitting: boolean }
  | { type: 'TOGGLE_CONFIRMATION' }
  | { type: 'ADD_FORM_FIELD'; field: FormField }
  | { type: 'UPDATE_FORM_FIELD'; id: string; updates: Partial<FormField> }
  | { type: 'REMOVE_FORM_FIELD'; id: string }
  | { type: 'MOVE_FORM_FIELD'; fromIndex: number; toIndex: number }
  | { type: 'RESET_FORM' };

const initialState: EventState = {
  data: {
    title: '',
    description: '',
    location: '',
    event_date: '',
    start_time: '',
    end_time: '',
    image_url: null,
    total_capacity: 1,
    is_unlimited_capacity: false,
    show_capacity: true,
    registration_status: 'open',
    auto_close_when_full: true,
    event_type: 'free',
    price: 0,
    price_inr: 0,
    price_usd: 0,
    currency: 'INR',
    qfix_link: '',
    use_custom_qfix_link: false,
    pricing_dropdown_label: '',
    pricing_options: [],
    form_fields: [],
    visibility: 'public',
    save_mode: 'publish',
    assigned_organizer: null,
    use_dual_region_pricing: false,
    dual_region_label: 'Where are you from?',
    region_labels: [],
  },
  errors: {},
  isSubmitting: false,
  showConfirmation: false,
};

function eventReducer(state: EventState, action: EventAction): EventState {
  switch (action.type) {
    case 'UPDATE_FIELD':
      return {
        ...state,
        data: {
          ...state.data,
          [action.field]: action.value,
        },
      };

    case 'SET_ERROR':
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.field]: action.error,
        },
      };

    case 'CLEAR_ERROR':
      const newErrors = { ...state.errors };
      delete newErrors[action.field];
      return {
        ...state,
        errors: newErrors,
      };

    case 'SET_SUBMITTING':
      return {
        ...state,
        isSubmitting: action.isSubmitting,
      };

    case 'TOGGLE_CONFIRMATION':
      return {
        ...state,
        showConfirmation: !state.showConfirmation,
      };

    case 'ADD_FORM_FIELD':
      return {
        ...state,
        data: {
          ...state.data,
          form_fields: [...state.data.form_fields, action.field],
        },
      };

    case 'UPDATE_FORM_FIELD':
      return {
        ...state,
        data: {
          ...state.data,
          form_fields: state.data.form_fields.map(field =>
            field.id === action.id ? { ...field, ...action.updates } : field
          ),
        },
      };

    case 'REMOVE_FORM_FIELD':
      return {
        ...state,
        data: {
          ...state.data,
          form_fields: state.data.form_fields.filter(field => field.id !== action.id),
        },
      };

    case 'MOVE_FORM_FIELD': {
      const fields = [...state.data.form_fields];
      const [moved] = fields.splice(action.fromIndex, 1);
      fields.splice(action.toIndex, 0, moved);
      return {
        ...state,
        data: {
          ...state.data,
          form_fields: fields,
        },
      };
    }

    case 'RESET_FORM':
      return initialState;

    default:
      return state;
  }
}

interface EventContextType {
  state: EventState;
  updateField: (field: keyof EventData, value: any) => void;
  setError: (field: string, error: string) => void;
  clearError: (field: string) => void;
  setSubmitting: (isSubmitting: boolean) => void;
  toggleConfirmation: () => void;
  addFormField: (field: FormField) => void;
  updateFormField: (id: string, updates: Partial<FormField>) => void;
  removeFormField: (id: string) => void;
  moveFormField: (fromIndex: number, toIndex: number) => void;
  resetForm: () => void;
  validateForm: () => boolean;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export function CreateEventProvider({
  children,
  initialData
}: {
  children: ReactNode;
  initialData?: Partial<EventData>;
}) {
  const [state, dispatch] = useReducer(eventReducer, {
    ...initialState,
    data: {
      ...initialState.data,
      ...(initialData || {}),
    },
  });

  const updateField = (field: keyof EventData, value: any) => {
    dispatch({ type: 'UPDATE_FIELD', field, value });
    // Clear error when field is updated
    if (state.errors[field as string]) {
      dispatch({ type: 'CLEAR_ERROR', field: field as string });
    }
  };

  const setError = (field: string, error: string) => {
    dispatch({ type: 'SET_ERROR', field, error });
  };

  const clearError = (field: string) => {
    dispatch({ type: 'CLEAR_ERROR', field });
  };

  const setSubmitting = (isSubmitting: boolean) => {
    dispatch({ type: 'SET_SUBMITTING', isSubmitting });
  };

  const toggleConfirmation = () => {
    dispatch({ type: 'TOGGLE_CONFIRMATION' });
  };

  const addFormField = (field: FormField) => {
    dispatch({ type: 'ADD_FORM_FIELD', field });
  };

  const updateFormField = useCallback((id: string, updates: Partial<FormField>) => {
    dispatch({ type: 'UPDATE_FORM_FIELD', id, updates });
  }, []);

  const removeFormField = (id: string) => {
    dispatch({ type: 'REMOVE_FORM_FIELD', id });
  };

  const moveFormField = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || fromIndex >= state.data.form_fields.length) return;
    if (toIndex < 0 || toIndex >= state.data.form_fields.length) return;
    dispatch({ type: 'MOVE_FORM_FIELD', fromIndex, toIndex });
  };

  const resetForm = () => {
    dispatch({ type: 'RESET_FORM' });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Section 1: Event Basics
    if (!state.data.title.trim()) {
      errors.title = 'Event title is required';
    }
    if (!state.data.description.trim()) {
      errors.description = 'Event description is required';
    }
    if (!state.data.location.trim()) {
      errors.location = 'Location is required';
    }
    if (!state.data.image_url) {
      errors.image_url = 'Event image is required';
    }
    if (!state.data.event_date) {
      errors.event_date = 'Event date is required';
    } else {
      const eventDate = new Date(state.data.event_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (eventDate < today) {
        errors.event_date = 'Event date must be today or in the future';
      }
    }
    if (!state.data.start_time) {
      errors.start_time = 'Start time is required';
    }
    if (!state.data.end_time) {
      errors.end_time = 'End time is required';
    } else if (state.data.start_time && state.data.end_time) {
      const start = new Date(`2000-01-01T${state.data.start_time}`);
      const end = new Date(`2000-01-01T${state.data.end_time}`);
      if (end <= start) {
        errors.end_time = 'End time must be after start time';
      }
    }

    // Section 2: Capacity & Registration
    if (!state.data.is_unlimited_capacity && state.data.total_capacity <= 0) {
      errors.total_capacity = 'Capacity must be greater than 0';
    }

    // Section 3: Pricing & Payment
    if (state.data.event_type === 'paid') {
      if (state.data.currency === 'DUAL') {
        // Dual-region fixed pricing
        if (state.data.price_inr <= 0 && state.data.price_usd <= 0) {
          errors.price = 'At least one price (INR or USD) must be greater than 0';
        }
        if (state.data.region_labels.length === 0) {
          errors.region_labels = 'At least one region label is required for dual-region pricing';
        }
      } else if (state.data.price <= 0) {
        errors.price = 'Price must be greater than 0 for paid events';
      }
    }
    
    if (state.data.event_type === 'custom') {
      if (!state.data.pricing_dropdown_label?.trim()) {
        errors.pricing_dropdown_label = 'Dropdown label is required for custom pricing';
      }
      
      if (state.data.pricing_options.length === 0) {
        errors.pricing_options = 'At least one pricing option is required';
      } else {
        // Validate each pricing option
        state.data.pricing_options.forEach((option, index) => {
          if (!option.label?.trim()) {
            errors[`pricing_option_${index}_label`] = 'Option name is required';
          }
          if (state.data.use_dual_region_pricing) {
            if ((option.price_inr || 0) <= 0 && (option.price_usd || 0) <= 0) {
              errors[`pricing_option_${index}_price`] = 'At least one price must be greater than 0';
            }
          } else {
            if (option.price <= 0) {
              errors[`pricing_option_${index}_price`] = 'Price must be greater than 0';
            }
          }
        });
        
        // Check for duplicate option names
        const labels = state.data.pricing_options.map(opt => opt.label?.trim().toLowerCase()).filter(Boolean);
        const uniqueLabels = new Set(labels);
        if (labels.length !== uniqueLabels.size) {
          errors.pricing_options = 'Duplicate option names are not allowed';
        }
      }
      
      // Validate region labels when dual-region is enabled for custom pricing
      if (state.data.use_dual_region_pricing && state.data.region_labels.length === 0) {
        errors.region_labels = 'At least one region label is required for dual-region pricing';
      }
    }

    // Set all errors
    Object.entries(errors).forEach(([field, error]) => {
      dispatch({ type: 'SET_ERROR', field, error });
    });

    return Object.keys(errors).length === 0;
  };

  const value: EventContextType = {
    state,
    updateField,
    setError,
    clearError,
    setSubmitting,
    toggleConfirmation,
    addFormField,
    updateFormField,
    removeFormField,
    moveFormField,
    resetForm,
    validateForm,
  };

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
}

export function useCreateEvent() {
  const context = useContext(EventContext);
  if (context === undefined) {
    throw new Error('useCreateEvent must be used within a CreateEventProvider');
  }
  return context;
}

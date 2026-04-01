"use client";

import { RegisterClient } from './RegisterClientNew';
import { CheckCircle2, Ticket, Lock, Clock } from 'lucide-react';

interface RegistrationFormField {
  id: string;
  label: string;
  field_type: string;
  required: boolean;
  options?: string[] | null;
  condition?: {
    field_id: string;
    value: string;
  };
}

interface PricingOption {
  id: string;
  label: string;
  price: number;
}

export function EventRegistrationSection({ 
  eventId, 
  registrationOpen, 
  isLoggedIn, 
  hasRegistered,
  hasPendingRegistration,
  isPendingVerification,
  pendingRegistrationId,
  registrationFormFields, 
  event, 
  pricingOptions 
}: { 
  eventId: string; 
  registrationOpen: boolean; 
  isLoggedIn: boolean;
  hasRegistered: boolean;
  hasPendingRegistration?: boolean;
  isPendingVerification?: boolean;
  pendingRegistrationId?: string;
  registrationFormFields?: RegistrationFormField[];
  event?: any;
  pricingOptions?: PricingOption[] | null;
}) {
  if (!registrationOpen) return null;
  
  if (!isLoggedIn) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-amber-50/80 to-orange-50/40 border border-amber-100/80 p-6 sm:p-8 shadow-sm transition-all duration-300 hover:shadow-md group mt-2">
        <div className="absolute -right-12 -top-12 w-40 h-40 bg-amber-400/10 blur-3xl rounded-full pointer-events-none transition-transform duration-500 group-hover:scale-110" />
        <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-orange-400/10 blur-2xl rounded-full pointer-events-none transition-transform duration-500 group-hover:scale-110" />
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-5">
          <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white text-amber-500 shadow-sm border border-amber-100 ring-4 ring-amber-50/50">
            <Lock className="w-6 h-6" />
          </div>
          
          <div className="space-y-1.5 flex flex-col items-center justify-center">
            <h4 className="text-amber-950 font-extrabold text-xl tracking-tight">Login Required</h4>
            <p className="text-amber-700/90 text-sm font-medium max-w-sm">Please login to your account to register for this event and secure your spot.</p>
          </div>
          
          <a 
            href="/login" 
            className="inline-flex items-center gap-2 mt-3 px-8 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl border border-amber-600/20 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          >
            Log In to Register
          </a>
        </div>
      </div>
    );
  }
  
  if (hasRegistered) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-emerald-50/80 to-teal-50/40 border border-emerald-100/80 p-6 sm:p-8 shadow-sm transition-all duration-300 hover:shadow-md group mt-2">
        <div className="absolute -right-12 -top-12 w-40 h-40 bg-emerald-400/10 blur-3xl rounded-full pointer-events-none transition-transform duration-500 group-hover:scale-110" />
        <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-teal-400/10 blur-2xl rounded-full pointer-events-none transition-transform duration-500 group-hover:scale-110" />
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-5">
          <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white text-emerald-500 shadow-sm border border-emerald-100 ring-4 ring-emerald-50/50">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          
          <div className="space-y-1.5">
            <h4 className="text-emerald-950 font-extrabold text-xl tracking-tight">You're on the list!</h4>
            <p className="text-emerald-700/90 text-sm font-medium">You have successfully registered for this event.</p>
          </div>
          
          <a 
            href="/tickets" 
            className="inline-flex items-center gap-2 mt-3 px-6 py-2.5 bg-white hover:bg-emerald-50 text-emerald-800 text-sm font-semibold rounded-xl border border-emerald-200/80 transition-all duration-200 shadow-sm hover:shadow hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <Ticket className="w-4 h-4 text-emerald-500" />
            View your tickets
          </a>
        </div>
      </div>
    );
  }

  if (isPendingVerification) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-blue-50/80 to-indigo-50/40 border border-blue-100/80 p-6 sm:p-8 shadow-sm transition-all duration-300 hover:shadow-md group mt-2">
        <div className="absolute -right-12 -top-12 w-40 h-40 bg-blue-400/10 blur-3xl rounded-full pointer-events-none transition-transform duration-500 group-hover:scale-110" />
        <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-indigo-400/10 blur-2xl rounded-full pointer-events-none transition-transform duration-500 group-hover:scale-110" />
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-5">
          <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white text-blue-500 shadow-sm border border-blue-100 ring-4 ring-blue-50/50">
            <Clock className="w-7 h-7" />
          </div>
          
          <div className="space-y-1.5">
            <h4 className="text-blue-950 font-extrabold text-xl tracking-tight">Verification Pending</h4>
            <p className="text-blue-700/90 text-sm font-medium">Your registration is currently being verified by the organizer. You will be notified once confirmed.</p>
          </div>
          
          <a 
            href="/dashboard" 
            className="inline-flex items-center gap-2 mt-3 px-6 py-2.5 bg-white hover:bg-blue-50 text-blue-800 text-sm font-semibold rounded-xl border border-blue-200/80 transition-all duration-200 shadow-sm hover:shadow hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <Ticket className="w-4 h-4 text-blue-500" />
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }
  
  return <RegisterClient eventId={eventId} formFields={registrationFormFields || []} event={event} pricingOptions={pricingOptions} hasRegistered={hasRegistered} hasPendingRegistration={hasPendingRegistration} isPendingVerification={isPendingVerification} pendingRegistrationId={pendingRegistrationId} />;
}

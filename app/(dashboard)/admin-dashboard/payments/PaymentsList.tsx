'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Calendar, Users, DollarSign } from 'lucide-react';
import { formatPrice } from '@/lib/currency';
import Pagination from '@/components/Pagination';

interface PaymentsListProps {
  payments: any[];
  totalItems: number;
  currentPage: number;
}

export default function PaymentsList({ payments, totalItems, currentPage }: PaymentsListProps) {
  const itemsPerPage = 10;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const getPaymentMethod = (payment: any) => {
    if (payment.razorpay_payment_id || payment.razorpay_order_id) return 'razorpay';
    return 'qfix';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS': return 'bg-green-100 text-green-800 border-green-200';
      case 'FAILED': return 'bg-red-100 text-red-800 border-red-200';
      case 'PENDING_VERIFICATION': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CREATED': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === 'PENDING_VERIFICATION') return 'PENDING VERIFICATION';
    return status;
  };

  return (
    <div className="space-y-4">
      {payments.map((payment: any) => {
        const isSuspicious = payment.status === 'SUCCESS' && payment.razorpay_payment_id && (!payment.registration || payment.registration?.status !== 'CONFIRMED');
        const reg = payment.registration;
        const method = getPaymentMethod(payment);
        const currency = reg?.currency || reg?.event?.currency || 'INR';
        
        return (
          <Card key={payment.id} className={`hover:shadow-md transition-shadow ${isSuspicious ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2 sm:gap-3">
                    <div className="flex items-center gap-2">
                      {method === 'qfix' ? (
                        <DollarSign className="w-5 h-5 text-blue-600" />
                      ) : (
                        <CreditCard className="w-5 h-5 text-green-600" />
                      )}
                      <h3 className="text-lg font-semibold text-gray-900">{formatPrice(Number(payment.amount), currency)}</h3>
                    </div>
                    <Badge className={getStatusBadge(payment.status)}>
                      {getStatusLabel(payment.status)}
                    </Badge>
                    <Badge variant="outline" className={method === 'qfix' ? 'border-blue-200 text-blue-700 bg-blue-50' : 'border-green-200 text-green-700 bg-green-50'}>
                      {method === 'qfix' ? 'QFIX / USD' : 'Razorpay'}
                    </Badge>
                    {isSuspicious && <Badge className="bg-red-100 text-red-800 border-red-200">Suspicious</Badge>}
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {reg?.event?.title ?? 'Event'} · {reg?.user?.full_name ?? 'User'}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Registration: {reg?.entry_code ?? (payment.status === 'PENDING_VERIFICATION' ? 'Awaiting Verification' : 'Missing')}
                    </div>
                    <div className="text-xs text-gray-500 space-y-1" suppressHydrationWarning>
                      {payment.razorpay_order_id && <p>Order ID: {payment.razorpay_order_id}</p>}
                      {payment.razorpay_payment_id && <p>Payment ID: {payment.razorpay_payment_id}</p>}
                      {method === 'qfix' && !payment.razorpay_payment_id && <p>Method: QFIX External Payment</p>}
                      <p>Created: {new Date(payment.created_at!).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  {reg && <Badge variant="outline" className="text-xs">Reg #{reg.id.slice(0, 8)}</Badge>}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      {totalPages > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
        />
      )}
    </div>
  );
}

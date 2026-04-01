"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function RegenerateQRCodesPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRegenerate = async () => {
    const toastId = toast.loading('Regenerating all QR codes...');

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/admin/regenerate-qr-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      setResult(data);
      toast.success(`Successfully regenerated ${data.successCount} QR codes`, { id: toastId });
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || 'Failed to regenerate QR codes', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Regenerate QR Codes</h1>
        <p className="text-gray-600">
          This tool will regenerate QR codes for all confirmed registrations to use the new secure HMAC-signed format.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>QR Code Regeneration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="font-semibold text-amber-800 mb-2">⚠️ Important Notes:</h3>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• This will update ALL confirmed registrations</li>
              <li>• New entry codes will be generated</li>
              <li>• Old QR codes will no longer work</li>
              <li>• Users will need to access their ticket pages again</li>
            </ul>
          </div>

          <Button
            onClick={handleRegenerate}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            {loading ? 'Regenerating...' : 'Regenerate All QR Codes'}
          </Button>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-800 mb-2">❌ Error:</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">✅ Regeneration Complete:</h3>
              <div className="text-sm text-green-700 space-y-2">
                <p><strong>Total registrations:</strong> {result.totalRegistrations}</p>
                <p><strong>Successfully updated:</strong> {result.successCount}</p>
                <p><strong>Failed updates:</strong> {result.failureCount}</p>
                
                {result.failureCount > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer font-medium">View failed updates</summary>
                    <div className="mt-2 space-y-1">
                      {result.details?.filter((d: any) => !d.success).map((detail: any, index: number) => (
                        <div key={index} className="text-xs bg-red-100 p-2 rounded">
                          <strong>ID:</strong> {detail.id} - <strong>Error:</strong> {detail.error}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

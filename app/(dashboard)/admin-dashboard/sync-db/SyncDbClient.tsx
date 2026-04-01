'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Database, Server, CheckCircle2, AlertTriangle, Loader2, Wrench } from 'lucide-react';
import { toast } from 'sonner';

export default function SyncDbClient() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [lastSync, setLastSync] = useState<{ status: 'success' | 'error' | null; message: string }>({
    status: null,
    message: ''
  });

  const handleSync = async () => {
    setIsSyncing(true);
    setLastSync({ status: null, message: '' });
    const toastId = toast.loading('Syncing database schema. This may take a minute...');

    try {
      const response = await fetch('/api/admin/sync-db', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync database');
      }

      setLastSync({
        status: 'success',
        message: 'Database schema successfully updated and synced.'
      });
      toast.success('Database fully synced!', { id: toastId });
      
    } catch (error: any) {
      console.error('Sync Error:', error);
      setLastSync({
        status: 'error',
        message: error.message || 'An unexpected error occurred during sync.'
      });
      toast.error('Failed to sync database', { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFixColumn = async () => {
    setIsFixing(true);
    setLastSync({ status: null, message: '' });
    const toastId = toast.loading('Checking and injecting missing column...');

    try {
      const response = await fetch('/api/admin/fix-is-unlimited', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to apply manual fix');
      }

      setLastSync({
        status: data.alreadyExisted ? 'success' : 'success',
        message: data.message
      });
      
      if (data.alreadyExisted) {
        toast.info('Column already exists', { id: toastId });
      } else {
        toast.success('Column added successfully!', { id: toastId });
      }
      
    } catch (error: any) {
      console.error('Fix Error:', error);
      setLastSync({
        status: 'error',
        message: error.message || 'An unexpected error occurred during the fix.'
      });
      toast.error('Failed to apply fix', { id: toastId });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 border-b pb-4">
          Database Synchronization
        </h2>
        <p className="mt-4 text-gray-500 max-w-2xl">
          Use this tool to synchronize the database schema across different environments. If columns are missing or out of sync (like 'is_unlimited'), clicking this button will forcefully align your database with the current application schema.
        </p>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm max-w-3xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-gray-50 mb-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 shrink-0">
              <Database className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">Prisma Database Push</h3>
              <p className="text-sm text-gray-500 mt-1">
                Executes: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-800 text-xs">npx prisma db push</code>
              </p>
            </div>
          </div>
          
          <Button 
            onClick={handleSync} 
            disabled={isSyncing}
            className="w-full md:w-auto h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md shadow-blue-200 transition-all active:scale-95"
          >
            {isSyncing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Updating Schema...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-5 w-5" />
                Sync Database Now
              </>
            )}
          </Button>
        </div>

        {/* Manual Fix Block */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-gray-50 mb-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-orange-50 flex items-center justify-center border border-orange-100 shrink-0">
              <Wrench className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">Fix Missing "is_unlimited" Column</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-sm">
                Runs direct SQL to safely check and inject the missing capacity column if the standard sync fails.
              </p>
            </div>
          </div>
          
          <Button 
            onClick={handleFixColumn} 
            disabled={isFixing}
            className="w-full md:w-auto h-12 px-6 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-md shadow-orange-200 transition-all active:scale-95"
          >
            {isFixing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Injecting...
              </>
            ) : (
              <>
                <Wrench className="mr-2 h-5 w-5" />
                Apply Auto-Fix
              </>
            )}
          </Button>
        </div>

        <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
          <h4 className="flex items-center font-medium text-gray-900 text-sm mb-3">
            <Server className="w-4 h-4 mr-2 text-gray-500" />
            System Status
          </h4>
          
          {lastSync.status === 'success' ? (
            <div className="flex items-start text-sm bg-green-50 text-green-800 p-4 rounded-lg border border-green-200">
              <CheckCircle2 className="h-5 w-5 mr-3 shrink-0 text-green-600" />
              <div>
                <span className="font-semibold block mb-1">Sync Successful</span>
                {lastSync.message}
              </div>
            </div>
          ) : lastSync.status === 'error' ? (
            <div className="flex items-start text-sm bg-red-50 text-red-800 p-4 rounded-lg border border-red-200">
               <AlertTriangle className="h-5 w-5 mr-3 shrink-0 text-red-600" />
               <div>
                 <span className="font-semibold block mb-1">Sync Failed</span>
                 {lastSync.message}
               </div>
            </div>
          ) : (
             <div className="text-sm text-gray-500 flex items-center h-10">
               Awaiting manual synchronization...
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

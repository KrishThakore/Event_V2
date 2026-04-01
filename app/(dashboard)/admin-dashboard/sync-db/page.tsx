import { Metadata } from 'next';
import SyncDbClient from './SyncDbClient';

export const metadata: Metadata = {
  title: 'Database Synchronization | Admin Dashboard',
  description: 'Synchronize database schema across environments',
};

export default function SyncDbPage() {
  return (
    <div className="p-8">
      <SyncDbClient />
    </div>
  );
}

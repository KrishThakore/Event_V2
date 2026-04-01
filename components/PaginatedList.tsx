'use client';

import { useState } from 'react';
import Pagination from '@/components/Pagination';

interface PaginatedListProps {
  items: any[];
  itemsPerPage?: number;
  renderItem: (item: any, index: number) => React.ReactNode;
  emptyMessage?: React.ReactNode;
  className?: string;
}

export default function PaginatedList({
  items,
  itemsPerPage = 10,
  renderItem,
  emptyMessage,
  className = 'space-y-4',
}: PaginatedListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const paginated = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (items.length === 0 && emptyMessage) {
    return <>{emptyMessage}</>;
  }

  return (
    <>
      <div className={className}>
        {paginated.map((item, idx) => renderItem(item, (currentPage - 1) * itemsPerPage + idx))}
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={items.length}
        itemsPerPage={itemsPerPage}
      />
    </>
  );
}

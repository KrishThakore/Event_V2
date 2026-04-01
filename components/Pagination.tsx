'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  className = '',
}: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [jumpValue, setJumpValue] = useState(currentPage.toString());

  useEffect(() => {
    setJumpValue(currentPage.toString());
  }, [currentPage]);

  const handlePageChange = (newPage: number) => {
    if (onPageChange) {
      onPageChange(newPage);
    } else {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', newPage.toString());
      router.push(`${pathname}?${params.toString()}`);
    }
  };

  const handleJump = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(jumpValue);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      handlePageChange(page);
    } else {
      setJumpValue(currentPage.toString());
    }
  };

  const getVisiblePages = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const startItem = totalItems ? (currentPage - 1) * (itemsPerPage || 10) + 1 : null;
  const endItem = totalItems ? Math.min(currentPage * (itemsPerPage || 10), totalItems) : null;

  return (
    <div className={`flex flex-col lg:flex-row items-center justify-between gap-4 pt-4 pb-2 ${className}`}>
      {totalItems != null && (
        <p className="text-sm text-slate-500 font-medium whitespace-nowrap order-2 lg:order-1">
          Showing <span className="text-slate-900">{startItem}</span>–<span className="text-slate-900">{endItem}</span> of{' '}
          <span className="text-slate-900">{totalItems}</span>
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2 order-1 lg:order-2">
        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-sm">
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage <= 1}
            className="p-2 rounded-lg text-slate-500 hover:bg-white hover:text-purple-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500 transition-all"
            title="First page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-2 rounded-lg text-slate-500 hover:bg-white hover:text-purple-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500 transition-all border-r border-slate-100 mr-1"
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1 mx-1">
            {getVisiblePages().map((page, idx) =>
              page === '...' ? (
                <span key={`dots-${idx}`} className="px-1 text-slate-400 font-bold select-none">…</span>
              ) : (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`min-w-[32px] h-8 rounded-lg text-xs font-bold transition-all ${
                    currentPage === page
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-200 scale-105'
                      : 'text-slate-600 hover:bg-white hover:text-purple-600'
                  }`}
                >
                  {page}
                </button>
              )
            )}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-2 rounded-lg text-slate-500 hover:bg-white hover:text-purple-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500 transition-all border-l border-slate-100 ml-1"
            title="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage >= totalPages}
            className="p-2 rounded-lg text-slate-500 hover:bg-white hover:text-purple-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500 transition-all"
            title="Last page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>

        {totalPages > 1 && (
          <form onSubmit={handleJump} className="flex items-center gap-2 ml-2">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Go to</span>
            <input
              type="text"
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
              className="w-12 h-9 text-center text-sm font-bold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white text-slate-700 shadow-sm"
            />
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">of {totalPages}</span>
          </form>
        )}
      </div>
    </div>
  );
}

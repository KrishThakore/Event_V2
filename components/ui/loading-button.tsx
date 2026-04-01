import React from 'react'
import LoadingSpinner from './loading-spinner'

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean
  children: React.ReactNode
}

export default function LoadingButton({ 
  isLoading = false, 
  children, 
  disabled, 
  className = '', 
  ...props 
}: LoadingButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`
        relative inline-flex items-center justify-center
        px-4 py-2 border border-transparent text-sm font-medium rounded-md
        shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-200
        ${className}
      `}
    >
      {isLoading && (
        <LoadingSpinner size="sm" className="mr-2" />
      )}
      {children}
    </button>
  )
}

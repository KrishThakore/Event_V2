import LoadingSpinner from './loading-spinner'

export default function PageLoading() {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 shadow-xl">
        <div className="flex flex-col items-center space-y-4">
          <LoadingSpinner size="lg" className="text-purple-600" />
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    </div>
  )
}

interface EducationalTipProps {
  message: string
  onClose?: () => void
}

export function EducationalTip({ message, onClose }: EducationalTipProps) {
  return (
    <div className="relative bg-blue-50 border-l-4 border-blue-500 rounded-r-xl p-4 my-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0 mt-0.5">💡</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-blue-800 mb-1">¿Qué aprendiste?</p>
          <p className="text-sm text-blue-700">{message}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-blue-400 hover:text-blue-600 text-sm"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

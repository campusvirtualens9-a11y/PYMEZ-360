interface LogoProps {
  size?: number
  className?: string
}

export function LogoPyme({ size = 40, className = '' }: LogoProps) {
  const id = 'pyme-logo-grad'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="PYME 360 Logo"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="40" x2="40" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>

      {/* Fondo redondeado */}
      <rect width="40" height="40" rx="10" fill={`url(#${id})`} />

      {/* Barras ascendentes (análisis financiero) */}
      <rect x="6"  y="27" width="7" height="8"  rx="2" fill="white" fillOpacity="0.55" />
      <rect x="16" y="19" width="7" height="16" rx="2" fill="white" fillOpacity="0.80" />
      <rect x="26" y="11" width="7" height="24" rx="2" fill="white" fillOpacity="1" />

      {/* Línea de tendencia */}
      <path
        d="M9.5 25 L19.5 17 L29.5 9"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeOpacity="0.45"
        fill="none"
      />

      {/* Punto de máxima — icono "360°" */}
      <circle cx="29.5" cy="9" r="3" fill="white" fillOpacity="0.85" />
      <circle cx="29.5" cy="9" r="1.2" fill="#7C3AED" fillOpacity="0.9" />
    </svg>
  )
}

export function LogoPymeLarge({ className = '' }: { className?: string }) {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="PYME 360 Logo"
    >
      <defs>
        <linearGradient id="pyme-lg" x1="0" y1="80" x2="80" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#1D4ED8" />
          <stop offset="50%"  stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <filter id="pyme-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#1D4ED8" floodOpacity="0.3" />
        </filter>
      </defs>

      <rect width="80" height="80" rx="20" fill="url(#pyme-lg)" filter="url(#pyme-shadow)" />

      {/* Barras */}
      <rect x="12" y="54" width="14" height="16" rx="4" fill="white" fillOpacity="0.50" />
      <rect x="32" y="38" width="14" height="32" rx="4" fill="white" fillOpacity="0.78" />
      <rect x="52" y="22" width="14" height="48" rx="4" fill="white" fillOpacity="1" />

      {/* Línea de tendencia */}
      <path
        d="M19 52 L39 34 L59 18"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeOpacity="0.4"
        fill="none"
      />

      {/* Punto / indicador 360° */}
      <circle cx="59" cy="18" r="6"   fill="white" fillOpacity="0.9" />
      <circle cx="59" cy="18" r="2.5" fill="#4F46E5" fillOpacity="0.95" />
    </svg>
  )
}

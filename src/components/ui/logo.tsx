interface LogoProps {
  size?: number
  showText?: boolean
  className?: string
}

export function Logo({ size = 32, showText = true, className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="32" height="32" rx="7" fill="#0070d2" />
        <path
          d="M16 7L25 23H7L16 7Z"
          fill="white"
        />
        <path
          d="M16 11L11 21H21L16 11Z"
          fill="#0070d2"
        />
      </svg>
      {showText && (
        <span className="text-sm font-bold text-[#16325c] block leading-tight">Tolmai ERP</span>
      )}
    </div>
  )
}

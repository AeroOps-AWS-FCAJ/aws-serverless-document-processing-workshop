import * as React from "react"

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number
}

export function Logo({ size = 24, className, ...props }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M7 3.5h12l6 6V28.5H7z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M19 3.5v6h6M11 15h10M11 19h7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10.5 24h5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="22" cy="24" r="3.5" fill="currentColor" />
      <path d="m20.7 24 1 1 1.8-2" stroke="var(--sidebar, #10261d)" strokeWidth="1.2" strokeLinecap="square" />
    </svg>
  )
}

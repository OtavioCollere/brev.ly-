export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <LinkIcon />
      <span className="text-lg font-bold text-gray-600">
        brev<span className="text-blue-base">.ly</span>
      </span>
    </div>
  )
}

function LinkIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      className="text-blue-base"
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="2" y="9" width="10" height="6" rx="3" transform="rotate(-45 7 12)" />
        <rect x="12" y="9" width="10" height="6" rx="3" transform="rotate(-45 17 12)" />
      </g>
    </svg>
  )
}

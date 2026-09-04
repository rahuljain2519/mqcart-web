// Minimal inline icon set (no icon library in deps). 24x24, currentColor stroke.

type P = { className?: string };
const base = "w-6 h-6";

export const HomeIcon = ({ className }: P) => (
  <svg className={className ?? base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
  </svg>
);

export const StoreIcon = ({ className }: P) => (
  <svg className={className ?? base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16l1 5a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0Z" />
    <path d="M5 11v9h14v-9" />
    <path d="M10 20v-5h4v5" />
  </svg>
);

export const ReceiptIcon = ({ className }: P) => (
  <svg className={className ?? base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 3v18l2-1.5L9 21l2-1.5L13 21l2-1.5L17 21l2-1.5V3l-2 1.5L15 3l-2 1.5L11 3 9 4.5 7 3Z" />
    <path d="M8 8h8M8 12h8M8 16h5" />
  </svg>
);

export const UserIcon = ({ className }: P) => (
  <svg className={className ?? base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
  </svg>
);

export const BoxIcon = ({ className }: P) => (
  <svg className={className ?? base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7.5 12 3l9 4.5v9L12 21 3 16.5Z" />
    <path d="M3 7.5 12 12l9-4.5M12 12v9" />
  </svg>
);

export const ChartIcon = ({ className }: P) => (
  <svg className={className ?? base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6" />
  </svg>
);

export const MicIcon = ({ className }: P) => (
  <svg className={className ?? "w-5 h-5"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);

export const ChevronDownIcon = ({ className }: P) => (
  <svg className={className ?? "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const SearchIcon = ({ className }: P) => (
  <svg className={className ?? "w-5 h-5"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

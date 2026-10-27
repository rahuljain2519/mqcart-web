/** Pill shown next to a shop's name once its seller has passed admin KYC
 *  approval (see Shop.isVerified in src/types/index.ts for why it's safe to
 *  trust this flag directly instead of re-deriving it here). */
export default function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium rounded-full bg-green-bg text-green px-2.5 py-0.5 whitespace-nowrap">
      <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 1.2l2.1 1.8 2.7-.3 1 2.5 2.5 1-.3 2.7 1.8 2.1-1.8 2.1.3 2.7-2.5 1-1 2.5-2.7-.3-2.1 1.8-2.1-1.8-2.7.3-1-2.5-2.5-1 .3-2.7L1.2 10l1.8-2.1-.3-2.7 2.5-1 1-2.5 2.7.3z" />
        <path
          d="M7 10l2 2 4-4"
          stroke="white"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Verified seller
    </span>
  );
}

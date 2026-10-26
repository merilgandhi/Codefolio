export default function ProBadge({ label = 'Pro account' }) {
  return (
    <span
      aria-label={label}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line-accent bg-soft px-2.5 py-1 text-[10px] leading-4 font-bold tracking-wider text-accent"
    >
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 16 16"
        fill="currentColor"
        className="size-3"
      >
        <path d="m8 1 1.8 5.2L15 8l-5.2 1.8L8 15 6.2 9.8 1 8l5.2-1.8L8 1Z" />
      </svg>
      PRO
    </span>
  );
}

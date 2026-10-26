export default function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only rounded-lg bg-action text-sm font-semibold text-action-ink focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:min-h-11 focus:px-5 focus:py-3 focus:outline-2 focus:outline-offset-4 focus:outline-focus"
    >
      Skip to main content
    </a>
  );
}

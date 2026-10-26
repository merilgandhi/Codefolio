import { Link } from 'react-router-dom';

export default function Brand() {
  return (
    <Link
      to="/"
      className="inline-flex items-center font-display text-2xl font-extrabold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
      aria-label="CodeFolio home"
    >
      <span className="mr-2.5 grid size-9 place-items-center rounded-[10px] bg-brand text-[17px] tracking-[-2px] text-brand-ink">
        &lt;/&gt;
      </span>
      CodeFolio<span className="text-accent">.</span>
    </Link>
  );
}

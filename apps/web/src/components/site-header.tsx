import Link from 'next/link';

export const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/projects/', label: 'Projects' },
  { href: '/about/', label: 'About' },
] as const;

export const SiteHeader = () => (
  <header className="border-b">
    <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4">
      <Link href="/" className="font-semibold">
        Qua Thomas
      </Link>
      <nav aria-label="Main" className="flex gap-4 text-sm">
        {NAV_LINKS.map(({ href, label }) => (
          <Link key={href} href={href} className="text-muted-foreground hover:text-foreground">
            {label}
          </Link>
        ))}
      </nav>
    </div>
  </header>
);

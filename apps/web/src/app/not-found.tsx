import Link from 'next/link';

const NotFoundPage = () => (
  <main className="space-y-4">
    <h1 className="text-3xl font-semibold">Page not found</h1>
    <p className="text-muted-foreground">That page doesn&apos;t exist.</p>
    <Link href="/" className="underline">
      Back home
    </Link>
  </main>
);

export default NotFoundPage;

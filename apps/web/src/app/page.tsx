import Link from 'next/link';
import { Button } from '@/components/ui/button';

const HomePage = () => (
  <main className="space-y-6">
    <h1 className="text-4xl font-semibold">Hi, I&apos;m Qua.</h1>
    {/* PLACEHOLDER: owner replaces */}
    <p className="text-muted-foreground text-lg">
      I build a new project every month and write up what I learned. This site collects them.
    </p>
    <Button asChild>
      <Link href="/projects/">See projects</Link>
    </Button>
  </main>
);

export default HomePage;

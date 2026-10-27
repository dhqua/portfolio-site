import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'About' };

const AboutPage = () => (
  <main className="space-y-4">
    <h1 className="text-3xl font-semibold">About</h1>
    {/* PLACEHOLDER: owner replaces */}
    <p>A short bio goes here: who I am, what I work on, and how to reach me.</p>
  </main>
);

export default AboutPage;

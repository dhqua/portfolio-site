import Link from 'next/link';
import { ProjectCard } from '@/components/project-card';
import { Button } from '@/components/ui/button';
import { getAllProjects } from '@/lib/projects';

const HomePage = async () => {
  const latest = (await getAllProjects()).slice(0, 3);
  return (
    <main className="space-y-8">
      <section className="space-y-6">
        <h1 className="text-4xl font-semibold">Hi, I&apos;m Qua.</h1>
        <p className="text-muted-foreground text-lg">
          I build one project a month and write up the decisions, tradeoffs, and lessons. Each is a
          small system that actually ships.
        </p>
        <Button asChild>
          <Link href="/projects/">See projects</Link>
        </Button>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Latest projects</h2>
        {latest.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </section>
    </main>
  );
};

export default HomePage;

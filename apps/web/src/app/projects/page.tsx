import type { Metadata } from 'next';
import { ProjectCard } from '@/components/project-card';
import { getAllProjects } from '@/lib/projects';

export const metadata: Metadata = { title: 'Projects' };

const ProjectsPage = async () => {
  const projects = await getAllProjects();
  return (
    <main className="space-y-6">
      <h1 className="text-3xl font-semibold">Projects</h1>
      <div className="space-y-4">
        {projects.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </div>
    </main>
  );
};

export default ProjectsPage;

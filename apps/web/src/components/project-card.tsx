import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ProjectSummary } from '@/lib/project-list';

export const ProjectCard = ({ project }: { readonly project: ProjectSummary }) => (
  <Link href={`/projects/${project.slug}/`} className="block">
    <Card className="hover:bg-muted/50 transition-colors">
      <CardHeader>
        <CardTitle>{project.title}</CardTitle>
        <CardDescription>
          <time dateTime={project.date}>{project.date}</time>
          {project.tags.length > 0 && ` · ${project.tags.join(', ')}`}
        </CardDescription>
      </CardHeader>
      <CardContent>{project.summary}</CardContent>
    </Card>
  </Link>
);

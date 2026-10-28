import type { Metadata } from 'next';
import { getProject, listProjectSlugs } from '@/lib/projects';

interface ProjectPageProps {
  readonly params: Promise<{ slug: string }>;
}

export const generateStaticParams = async () =>
  (await listProjectSlugs()).map((slug) => ({ slug }));

// Unknown slugs 404 instead of rendering on demand.
export const dynamicParams = false;

export const generateMetadata = async ({ params }: ProjectPageProps): Promise<Metadata> => {
  const { slug } = await params;
  const { frontmatter } = await getProject(slug);
  return { title: frontmatter.title, description: frontmatter.summary };
};

const ProjectPage = async ({ params }: ProjectPageProps) => {
  const { slug } = await params;
  const { frontmatter, Content } = await getProject(slug);
  return (
    <main>
      <h1 className="text-3xl font-semibold">{frontmatter.title}</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        <time dateTime={frontmatter.date}>{frontmatter.date}</time>
      </p>
      <article className="prose dark:prose-invert mt-6 max-w-none">
        <Content />
      </article>
    </main>
  );
};

export default ProjectPage;

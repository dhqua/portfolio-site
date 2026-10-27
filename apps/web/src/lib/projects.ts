import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { projectFrontmatterSchema, type ProjectFrontmatter } from '@portfolio/shared';
import type { ComponentType } from 'react';
import { publishedProjects, type ProjectSummary } from './project-list.ts';

// `next build` runs from apps/web; write-ups live at the repo root so the assistant can read them too.
const CONTENT_DIR = path.join(process.cwd(), '..', '..', 'content', 'projects');

export const listProjectSlugs = async (): Promise<string[]> =>
  (await readdir(CONTENT_DIR))
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => file.slice(0, -'.mdx'.length));

export interface Project {
  readonly frontmatter: ProjectFrontmatter;
  readonly Content: ComponentType;
}

export const getProject = async (slug: string): Promise<Project> => {
  const mdx = (await import(`../../../../content/projects/${slug}.mdx`)) as {
    default: ComponentType;
    frontmatter: unknown;
  };
  return { frontmatter: projectFrontmatterSchema.parse(mdx.frontmatter), Content: mdx.default };
};

export const getAllProjects = async (): Promise<ProjectSummary[]> => {
  const slugs = await listProjectSlugs();
  const projects = await Promise.all(
    slugs.map(async (slug) => ({ slug, ...(await getProject(slug)).frontmatter })),
  );
  return publishedProjects(projects);
};

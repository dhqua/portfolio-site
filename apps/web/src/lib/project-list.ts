import type { ProjectFrontmatter } from '@portfolio/shared';

export interface ProjectSummary extends ProjectFrontmatter {
  readonly slug: string;
}

/** Published projects only, newest first (ISO dates sort lexically). */
export const publishedProjects = (projects: readonly ProjectSummary[]): ProjectSummary[] =>
  projects.filter((project) => !project.draft).sort((a, b) => b.date.localeCompare(a.date));

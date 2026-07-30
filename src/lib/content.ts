import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import type { Experience, Project } from "../types/content";

const contentDir = path.join(process.cwd(), "content");

function readContentFile(filename: string) {
	const filePath = path.join(contentDir, filename);
	return fs.readFileSync(filePath, "utf-8");
}

export function getExperiences(): Experience[] {
	const { data } = matter(readContentFile("experiences.md"));
	const experiences = (data.experiences ?? []) as Experience[];

	return experiences.sort(
		(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
	);
}

export function getExperienceBySlug(slug: string): Experience | undefined {
	return getExperiences().find((experience) => experience.slug === slug);
}

export function getRelatedExperiences(
	current: Experience,
	limit = 3,
): Experience[] {
	return getExperiences()
		.filter(
			(experience) =>
				experience.slug !== current.slug &&
				(experience.category === current.category ||
					experience.tags?.some((tag) => current.tags?.includes(tag))),
		)
		.slice(0, limit);
}

export function getProjects(): Project[] {
	const { data } = matter(readContentFile("projects.md"));
	const projects = (data.projects ?? []) as Project[];

	return projects.sort(
		(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
	);
}

export function getProjectBySlug(slug: string): Project | undefined {
	return getProjects().find((project) => project.slug === slug);
}

export function getProjectCategories(): string[] {
	const categories = getProjects().map((project) => project.category);
	return [...new Set(categories)];
}

export function getProjectsByCategory(category: string): Project[] {
	return getProjects().filter(
		(project) => project.category.toLowerCase() === category.toLowerCase(),
	);
}

export function getFeaturedProjects(): Project[] {
	return getProjects().filter((project) => project.featured);
}

export function getRelatedProjects(current: Project, limit = 3): Project[] {
	return getProjects()
		.filter(
			(project) =>
				project.slug !== current.slug &&
				project.category === current.category,
		)
		.slice(0, limit);
}

export function getProjectUrl(slug: string): string {
	return `/${slug}`;
}

export function getExperienceUrl(slug: string): string {
	return `/experiences/${slug}`;
}

export function getProjectRouteSlug(slug: string): string {
	return slug.replace(/^projects\//, "");
}

export function formatContentDate(date: string): string {
	return new Date(date).toLocaleDateString("en-US", {
		year: "numeric",
		month: "long",
	});
}

export function renderMarkdown(content = ""): string {
	return marked.parse(content, { async: false }) as string;
}

export function categoryToPath(category: string): string {
	const normalized = category.toLowerCase().replace(/\//g, "-");
	return `/projects/${normalized}`;
}

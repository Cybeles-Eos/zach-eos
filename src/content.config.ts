import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const journeys = defineCollection({
	loader: glob({ base: "./src/content/journeys", pattern: "**/*.md" }),
	schema: z.object({
		title: z.string(),
		category: z.string(),
		description: z.string(),
		banner: z.string().optional(),
	}),
});

const fullstackProjects = defineCollection({
	loader: glob({ base: "./src/content/fullstack-projects", pattern: "**/*.md" }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		year: z.string(),
		category: z.string(),
		thumbnail: z.string(),
		thumbnailAlt: z.string(),
		previewMedia: z.object({
			type: z.enum(["image", "video"]),
			src: z.string(),
			alt: z.string(),
			poster: z.string().optional(),
		}),
		date: z.coerce.date(),
		metaTitle: z.string(),
		metaDescription: z.string(),
		metaBanner: z.string(),
		isFeatured: z.boolean(),
		isActive: z.boolean(),
	}),
});

export const collections = { journeys, fullstackProjects };

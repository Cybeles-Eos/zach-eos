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

export const collections = { journeys };

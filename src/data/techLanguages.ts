/**
 * Skills / tools data — one entry = one falling capsule.
 *
 * How to add a tool:
 * 1. Download SVG from https://svgl.app (search tool → copy URL like https://svgl.app/library/vue.svg)
 * 2. Save to public/icons/skills/your-icon.svg
 * 3. Add an object below (category is for your reference only)
 * 4. Refresh — a new capsule spawns automatically
 *
 * Fields:
 * - text: label shown on capsule
 * - svg: path to icon in public/icons/skills/
 * - svgDark: optional dark-theme icon (if SVGL has light/dark variants)
 * - badge: version or tag on the right pill
 * - badgeColor: hex background for the badge
 * - badgeTextColor: optional (use dark text on light badges, e.g. JavaScript)
 * - category: "frontend" | "backend" | "tools"
 */
export type TechCategory = "frontend" | "backend" | "tools";

export type TechLanguage = {
	text: string;
	svg: string;
	svgDark?: string;
	badge: string;
	badgeColor: string;
	badgeTextColor?: string;
	category: TechCategory;
};

const icon = (name: string) => `/icons/skills/${name}`;

/** Single source of truth — one falling pill per entry. Icons from https://svgl.app (Wix via Simple Icons). */
export const TECH_LANGUAGES: TechLanguage[] = [
	// Frontend
	{ text: "HTML", svg: icon("html5.svg"), badge: "5", badgeColor: "#e34c26", category: "frontend" },
	{ text: "CSS", svg: icon("css.svg"), badge: "3", badgeColor: "#264de4", category: "frontend" },
	{ text: "SCSS", svg: icon("sass.svg"), badge: "Sass", badgeColor: "#cd6799", category: "frontend" },
	{
		text: "JavaScript",
		svg: icon("javascript.svg"),
		badge: "ES6+",
		badgeColor: "#f0db4f",
		badgeTextColor: "#14171b",
		category: "frontend",
	},
	{
		text: "React",
		svg: icon("react-light.svg"),
		svgDark: icon("react-dark.svg"),
		badge: "18.0",
		badgeColor: "#61dafb",
		category: "frontend",
	},
	{
		text: "Bootstrap",
		svg: icon("bootstrap.svg"),
		badge: "5.3",
		badgeColor: "#7952b3",
		category: "frontend",
	},
	{
		text: "Tailwind CSS",
		svg: icon("tailwindcss.svg"),
		badge: "3.x",
		badgeColor: "#0f766e",
		category: "frontend",
	},
	{
		text: "jQuery",
		svg: icon("jquery-light.svg"),
		svgDark: icon("jquery-dark.svg"),
		badge: "3.7",
		badgeColor: "#0868ac",
		category: "frontend",
	},
	{
		text: "Astro",
		svg: icon("astro-light.svg"),
		svgDark: icon("astro-dark.svg"),
		badge: "7.1",
		badgeColor: "#7c3aed",
		category: "frontend",
	},
	// Backend
	{
		text: "PHP",
		svg: icon("php-light.svg"),
		svgDark: icon("php-dark.svg"),
		badge: "8.x",
		badgeColor: "#777bb4",
		category: "backend",
	},
	{
		text: "Laravel",
		svg: icon("laravel.svg"),
		badge: "11.x",
		badgeColor: "#ff2d20",
		category: "backend",
	},
	{
		text: "MySQL",
		svg: icon("mysql-light.svg"),
		svgDark: icon("mysql-dark.svg"),
		badge: "8.x",
		badgeColor: "#00758f",
		category: "backend",
	},
	// Tools
	{
		text: "Figma",
		svg: icon("figma.svg"),
		badge: "Design Tool",
		badgeColor: "#f24e1e",
		category: "tools",
	},
	{
		text: "Canva",
		svg: icon("canva.svg"),
		badge: "Design",
		badgeColor: "#00c4cc",
		category: "tools",
	},
	{
		text: "Wix",
		svg: icon("wix.svg"),
		badge: "Website Builder",
		badgeColor: "#0c6efc",
		category: "tools",
	},
];

export const TECH_BY_CATEGORY = {
	frontend: TECH_LANGUAGES.filter((item) => item.category === "frontend"),
	backend: TECH_LANGUAGES.filter((item) => item.category === "backend"),
	tools: TECH_LANGUAGES.filter((item) => item.category === "tools"),
} as const;

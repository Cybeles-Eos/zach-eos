/** Placeholder icon — swap per entry when real brand SVGs are ready. */
export const LARAVEL_ICON = "/icons/laravel.svg";

export type TechLanguage = {
	svg: string;
	text: string;
};

/** Single source of truth — one falling pill per entry. */
export const TECH_LANGUAGES: TechLanguage[] = [
	{ svg: LARAVEL_ICON, text: "Laravel" },
	{ svg: LARAVEL_ICON, text: "JavaScript" },
	{ svg: LARAVEL_ICON, text: "React" },
	{ svg: LARAVEL_ICON, text: "TypeScript" },
	{ svg: LARAVEL_ICON, text: "Node.js" },
	{ svg: LARAVEL_ICON, text: "PHP" },
	{ svg: LARAVEL_ICON, text: "MySQL" },
	{ svg: LARAVEL_ICON, text: "Tailwind CSS" },
	{ svg: LARAVEL_ICON, text: "Figma" },
	{ svg: LARAVEL_ICON, text: "Git" },
	{ svg: LARAVEL_ICON, text: "Astro" },
	{ svg: LARAVEL_ICON, text: "Sass" },
];

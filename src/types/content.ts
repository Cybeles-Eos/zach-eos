export interface Experience {
	slug: string;
	title: string;
	description: string;
	company?: string;
	category: string;
	location?: string;
	date: string;
	cover?: string;
	featured?: boolean;
	tags?: string[];
	content?: string;
}

export interface Project {
	slug: string;
	title: string;
	description: string;
	category: string;
	date: string;
	featured?: boolean;
	cover?: string;
	technologies?: string[];
	tools?: string[];
	demo?: string;
	github?: string;
	figma?: string;
	content?: string;
}

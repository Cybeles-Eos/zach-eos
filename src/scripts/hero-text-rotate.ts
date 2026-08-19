const SELECTOR = "[data-hero-text-rotator]";
const INTERVAL_MS = 3200;
const ANIMATION_MS = 450;

let timer: ReturnType<typeof setInterval> | null = null;
let listenersBound = false;

const prefersReducedMotion = () =>
	window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const parseTexts = (el: HTMLElement) => {
	try {
		const texts = JSON.parse(el.dataset.heroTexts || "[]") as string[];
		return texts.filter(Boolean);
	} catch {
		return [];
	}
};

const stop = () => {
	if (timer) {
		clearInterval(timer);
		timer = null;
	}
};

export const destroyHeroTextRotate = () => {
	stop();
};

export const initHeroTextRotate = () => {
	stop();

	const el = document.querySelector<HTMLElement>(SELECTOR);
	if (!el) return;

	const texts = parseTexts(el);
	if (texts.length <= 1 || prefersReducedMotion()) return;

	let index = texts.indexOf(el.textContent?.trim() ?? "");
	if (index < 0) index = 0;

	const showNext = () => {
		if (el.classList.contains("is-leaving")) return;

		el.classList.add("is-leaving");

		window.setTimeout(() => {
			index = (index + 1) % texts.length;
			el.textContent = texts[index];
			el.classList.remove("is-leaving");
			el.classList.add("is-entering");

			requestAnimationFrame(() => {
				el.classList.remove("is-entering");
			});
		}, ANIMATION_MS);
	};

	const start = () => {
		timer = window.setInterval(showNext, INTERVAL_MS);
	};

	if (document.querySelector('[data-screen-loader][aria-busy="true"]')) {
		window.addEventListener("loader:complete", start, { once: true });
		return;
	}

	start();
};

export const setupHeroTextRotate = () => {
	if (!listenersBound) {
		listenersBound = true;
		document.addEventListener("astro:before-swap", destroyHeroTextRotate);
		document.addEventListener("astro:after-swap", initHeroTextRotate);
	}

	initHeroTextRotate();
};

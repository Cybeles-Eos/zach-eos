import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

const SELECTOR = ".text-ani-gsap";

let ctx: gsap.Context | null = null;
let listenersBound = false;

const prefersReducedMotion = () =>
	window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const isLoaderBusy = () =>
	Boolean(document.querySelector('[data-screen-loader][aria-busy="true"]'));

export function refreshTextAniGsap() {
	ScrollTrigger.update();
}

export function destroyTextAniGsap() {
	ctx?.revert();
	ctx = null;
}

export function initTextAniGsap() {
	destroyTextAniGsap();

	const elements = document.querySelectorAll<HTMLElement>(SELECTOR);
	if (!elements.length) return;

	if (prefersReducedMotion()) {
		elements.forEach((el) => el.classList.add("is-split"));
		return;
	}

	ctx = gsap.context(() => {
		elements.forEach((el) => {
			SplitText.create(el, {
				type: "words",
				tag: "span",
				wordsClass: "text-ani-gsap__word",
				autoSplit: true,
				onSplit(self) {
					el.classList.add("is-split");
					if (el.dataset.textAniPlayed === "true") return;

					return gsap.from(self.words, {
						opacity: 0,
						y: 15,
						stagger: 0.06,
						duration: 0.5,
						ease: "power2.out",
						scrollTrigger: {
							trigger: el,
							start: "top center",
							once: true,
						},
						onComplete: () => {
							el.dataset.textAniPlayed = "true";
						},
					});
				},
			});
		});
	});
}

const runAfterLayout = () => {
	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			initTextAniGsap();
			ScrollTrigger.refresh();
		});
	});
};

const startWhenReady = () => {
	if (isLoaderBusy()) {
		window.addEventListener("loader:complete", runAfterLayout, { once: true });
		return;
	}

	runAfterLayout();
};

export function setupTextAniGsap() {
	if (!listenersBound) {
		listenersBound = true;
		document.addEventListener("astro:before-swap", destroyTextAniGsap);
		document.addEventListener("astro:after-swap", startWhenReady);
	}

	startWhenReady();
}

import Matter from "matter-js";
import { TECH_LANGUAGES, type TechLanguage } from "../data/techLanguages";

const {
	Engine,
	Render,
	Runner,
	Bodies,
	Body,
	Composite,
	Events,
	Mouse,
	MouseConstraint,
	Query,
} = Matter;

const PILL_FILL = "#171818";
const PILL_STROKE = "#191A1A";
const PILL_STROKE_WIDTH = 1;
const TEXT_COLOR = "#ffffff";
const PILL_HEIGHT = 80;
const PADDING = 7;
const ICON_GAP = 10;
const ICON_SIZE = 56;
const ICON_ASPECT = 29 / 30;
const FONT_SIZE = 26;
const FONT_WEIGHT = "400";
const FONT_FAMILY = "Satoshi, sans-serif";

const DEFAULT_SVG =
	"data:image/svg+xml," +
	encodeURIComponent(
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path d="M8 6h8M8 12h8M8 18h8" stroke="%23ffffff" stroke-width="2" stroke-linecap="round"/></svg>',
	);

type PillPlugin = {
	text: string;
	svg: string;
	fontSize: number;
	width: number;
	height: number;
	contentWidth: number;
	iconWidth: number;
};

type SkillsPhysics = {
	destroy: () => void;
	respawn: () => void;
};

const svgCache = new Map<string, HTMLImageElement>();

function preloadSvg(url: string): Promise<HTMLImageElement> {
	const cached = svgCache.get(url);
	if (cached?.complete) return Promise.resolve(cached);

	return new Promise((resolve) => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => {
			svgCache.set(url, img);
			resolve(img);
		};
		img.onerror = () => {
			if (url !== DEFAULT_SVG) {
				preloadSvg(DEFAULT_SVG).then(resolve);
				return;
			}
			svgCache.set(url, img);
			resolve(img);
		};
		img.src = url;
		svgCache.set(url, img);
	});
}

function preloadAllSvgs(items: TechLanguage[]): Promise<void> {
	const urls = [...new Set([DEFAULT_SVG, ...items.map((item) => item.svg)])];
	return Promise.all(urls.map(preloadSvg)).then(() => undefined);
}

function measurePill(ctx: CanvasRenderingContext2D, text: string) {
	ctx.font = `${FONT_WEIGHT} ${FONT_SIZE}px ${FONT_FAMILY}`;
	const textWidth = ctx.measureText(text).width;
	const iconWidth = ICON_SIZE * ICON_ASPECT;
	const contentWidth = iconWidth + ICON_GAP + textWidth;
	const width = Math.max(contentWidth + PADDING * 2, 236);
	const height = PILL_HEIGHT;
	return { width, height, contentWidth, textWidth, iconWidth };
}

function drawRoundedRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	r: number,
) {
	const radius = Math.min(r, w / 2, h / 2);
	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.lineTo(x + w - radius, y);
	ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
	ctx.lineTo(x + w, y + h - radius);
	ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
	ctx.lineTo(x + radius, y + h);
	ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
	ctx.lineTo(x, y + radius);
	ctx.quadraticCurveTo(x, y, x + radius, y);
	ctx.closePath();
}

export function initSkillsPhysics(
	canvas: HTMLCanvasElement,
	section: HTMLElement,
	items: TechLanguage[] = TECH_LANGUAGES,
): SkillsPhysics {
	const wrap = canvas.parentElement;
	if (!wrap) {
		return { destroy: () => undefined, respawn: () => undefined };
	}

	const engine = Engine.create();
	engine.gravity.y = 1.1;
	engine.enableSleeping = false;

	let width = 0;
	let height = 0;
	let hasStarted = false;
	let render: Matter.Render;
	let runner: Matter.Runner;
	let mouse: Matter.Mouse;
	let mouseConstraint: Matter.MouseConstraint;
	let drawPills: () => void;
	let onResize: () => void;
	let onStartDrag: (event: Matter.IEvent<Matter.MouseConstraint>) => void;
	let onAfterUpdate: () => void;
	let observer: IntersectionObserver | null = null;

	const getBounds = () => wrap.getBoundingClientRect();

	const createPill = (x: number, y: number, item: TechLanguage) => {
		const ctx = canvas.getContext("2d");
		if (!ctx) return null;

		const { width: pillWidth, height: pillHeight, contentWidth, iconWidth } = measurePill(
			ctx,
			item.text,
		);

		const body = Bodies.rectangle(x, y, pillWidth, pillHeight, {
			chamfer: { radius: pillHeight / 2 },
			restitution: 0.35,
			friction: 0.45,
			frictionAir: 0.012,
			density: 0.0012,
			label: "pill",
			render: { visible: false },
		});

		body.plugin = {
			text: item.text,
			svg: item.svg,
			fontSize: FONT_SIZE,
			width: pillWidth,
			height: pillHeight,
			contentWidth,
			iconWidth,
		} satisfies PillPlugin;

		return body;
	};

	const buildWalls = () => {
		const wallOptions = { isStatic: true, label: "wall", render: { visible: false } };
		return [
			Bodies.rectangle(width / 2, height + 30, width + 200, 80, wallOptions),
			Bodies.rectangle(-40, height / 2, 80, height * 2, wallOptions),
			Bodies.rectangle(width + 40, height / 2, 80, height * 2, wallOptions),
		];
	};

	const clearDynamicBodies = () => {
		Composite.allBodies(engine.world)
			.filter((body) => body.label === "pill")
			.forEach((body) => Composite.remove(engine.world, body));
	};

	const spawnAll = () => {
		clearDynamicBodies();

		items.forEach((item, index) => {
			const x = width * (0.12 + Math.random() * 0.76);
			const y = -80 - index * (48 + Math.random() * 24);
			const body = createPill(x, y, item);
			if (!body) return;

			Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.12);
			Composite.add(engine.world, body);
		});
	};

	const rebuildWorld = (spawn = hasStarted) => {
		const bounds = getBounds();
		width = Math.max(Math.floor(bounds.width), 1);
		height = Math.max(Math.floor(bounds.height), 1);
		const pixelRatio = Math.min(window.devicePixelRatio, 2);

		render.options.width = width;
		render.options.height = height;
		render.options.pixelRatio = pixelRatio;
		render.canvas.width = width * pixelRatio;
		render.canvas.height = height * pixelRatio;
		render.canvas.style.width = `${width}px`;
		render.canvas.style.height = `${height}px`;

		mouse.pixelRatio = pixelRatio;

		Composite.allBodies(engine.world)
			.filter((body) => body.label === "wall")
			.forEach((body) => Composite.remove(engine.world, body));

		Composite.add(engine.world, buildWalls());

		if (spawn) spawnAll();
	};

	const startAnimation = () => {
		if (hasStarted) return;
		hasStarted = true;
		spawnAll();
		observer?.disconnect();
		observer = null;
	};

	render = Render.create({
		canvas,
		engine,
		options: {
			width: 1,
			height: 1,
			background: "transparent",
			wireframes: false,
			pixelRatio: 1,
		},
	});

	runner = Runner.create();
	Runner.run(runner, engine);
	Render.run(render);

	mouse = Mouse.create(canvas);
	mouseConstraint = MouseConstraint.create(engine, {
		mouse,
		constraint: {
			stiffness: 1,
			damping: 0,
			length: 0,
			render: { visible: false },
		},
	});
	Composite.add(engine.world, mouseConstraint);
	render.mouse = mouse;

	drawPills = () => {
		const ctx = render.context;
		const pillBodies = Composite.allBodies(engine.world).filter((body) => body.label === "pill");

		pillBodies.forEach((body) => {
			const plugin = body.plugin as PillPlugin;
			const {
				width: pillWidth,
				height: pillHeight,
				text,
				svg,
				iconWidth,
			} = plugin;

			const x = -pillWidth / 2;
			const y = -pillHeight / 2;
			const radius = pillHeight / 2;

			ctx.save();
			ctx.translate(body.position.x, body.position.y);
			ctx.rotate(body.angle);

			drawRoundedRect(ctx, x, y, pillWidth, pillHeight, radius);
			ctx.fillStyle = PILL_FILL;
			ctx.fill();

			const inset = PILL_STROKE_WIDTH / 2;
			drawRoundedRect(
				ctx,
				x + inset,
				y + inset,
				pillWidth - PILL_STROKE_WIDTH,
				pillHeight - PILL_STROKE_WIDTH,
				radius - inset,
			);
			ctx.strokeStyle = PILL_STROKE;
			ctx.lineWidth = PILL_STROKE_WIDTH;
			ctx.stroke();

			const icon = svgCache.get(svg) ?? svgCache.get(DEFAULT_SVG);
			const contentLeft = x + PADDING;

			if (icon?.complete && icon.naturalWidth) {
				ctx.drawImage(icon, contentLeft, -ICON_SIZE / 2, iconWidth, ICON_SIZE);
			}

			ctx.fillStyle = TEXT_COLOR;
			ctx.font = `${FONT_WEIGHT} ${FONT_SIZE}px ${FONT_FAMILY}`;
			ctx.textBaseline = "middle";
			ctx.fillText(text, contentLeft + iconWidth + ICON_GAP, 0);

			ctx.restore();
		});
	};

	onStartDrag = (event) => {
		const body = event.source.body;
		if (!body || body.label !== "pill") return;
		Body.setVelocity(body, { x: 0, y: 0 });
		Body.setAngularVelocity(body, 0);
	};

	onAfterUpdate = () => {
		const pillBodies = Composite.allBodies(engine.world).filter((body) => body.label === "pill");

		if (mouseConstraint.body) {
			canvas.style.cursor = "grabbing";
			return;
		}

		if (Query.point(pillBodies, mouse.position).length > 0) {
			canvas.style.cursor = "pointer";
			return;
		}

		canvas.style.cursor = "default";
	};

	Events.on(render, "afterRender", drawPills);
	Events.on(mouseConstraint, "startdrag", onStartDrag);
	Events.on(engine, "afterUpdate", onAfterUpdate);

	onResize = () => rebuildWorld();
	window.addEventListener("resize", onResize);

	observer = new IntersectionObserver(
		([entry]) => {
			if (entry.isIntersecting) startAnimation();
		},
		{ threshold: 0.15 },
	);
	observer.observe(section);

	const ready = document.fonts?.ready ?? Promise.resolve();
	const init = preloadAllSvgs(items).then(() => ready).then(() => rebuildWorld(false));

	return {
		respawn: () => {
			if (!hasStarted) return;
			spawnAll();
		},
		destroy: () => {
			void init;
			observer?.disconnect();
			window.removeEventListener("resize", onResize);
			Events.off(render, "afterRender", drawPills);
			Events.off(mouseConstraint, "startdrag", onStartDrag);
			Events.off(engine, "afterUpdate", onAfterUpdate);
			Render.stop(render);
			Runner.stop(runner);
			Engine.clear(engine);
			canvas.style.cursor = "default";
		},
	};
}

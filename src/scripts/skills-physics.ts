import Matter from "matter-js";
import { TECH_LANGUAGES, type TechLanguage } from "../data/techLanguages";

const { Engine, Runner, Bodies, Body, Composite, Events, Mouse, MouseConstraint, Query } = Matter;

const MOBILE_MQ = "(max-width: 492px)";
const GRID_GAP_X = 16;
const GRID_GAP_Y = 16;
const GRID_PADDING_BOTTOM = 48;

type SkillsMode = "falling" | "arranged";

type SkillsPhysics = {
	destroy: () => void;
	toggleArrange: () => void;
};

export function initSkillsPhysics(
	stage: HTMLElement,
	section: HTMLElement,
	items: TechLanguage[] = TECH_LANGUAGES,
): SkillsPhysics {
	const capsules = [...stage.querySelectorAll<HTMLElement>("[data-skills-capsule]")];

	const engine = Engine.create();
	engine.gravity.y = 1.1;
	engine.enableSleeping = false;

	let width = 0;
	let height = 0;
	let hasStarted = false;
	let mode: SkillsMode = "falling";
	let runner: Matter.Runner;
	let mouse: Matter.Mouse;
	let mouseConstraint: Matter.MouseConstraint;
	let observer: IntersectionObserver | null = null;
	const bodyToEl = new Map<number, HTMLElement>();

	const getBounds = () => stage.getBoundingClientRect();

	const getColumnCount = () => (window.matchMedia(MOBILE_MQ).matches ? 2 : 3);

	const getCapsuleSize = (el: HTMLElement) => {
		const { width: pillWidth, height: pillHeight } = el.getBoundingClientRect();
		return {
			width: Math.max(pillWidth, 1),
			height: Math.max(pillHeight, 1),
		};
	};

	const measureCapsule = (el: HTMLElement) => {
		el.removeAttribute("data-active");
		el.style.transform = "translate(-9999px, -9999px)";
		return getCapsuleSize(el);
	};

	const createPill = (x: number, y: number, el: HTMLElement) => {
		const { width: pillWidth, height: pillHeight } = measureCapsule(el);

		const body = Bodies.rectangle(x, y, pillWidth, pillHeight, {
			chamfer: { radius: pillHeight / 2 },
			restitution: 0.35,
			friction: 0.45,
			frictionAir: 0.012,
			density: 0.0012,
			label: "pill",
		});

		bodyToEl.set(body.id, el);
		el.setAttribute("data-active", "");
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

	const syncDom = () => {
		for (const body of Composite.allBodies(engine.world)) {
			if (body.label !== "pill") continue;
			const el = bodyToEl.get(body.id);
			if (!el) continue;

			const { x, y } = body.position;
			const rotate = mode === "arranged" ? "" : ` rotate(${body.angle}rad)`;
			el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)${rotate}`;
		}
	};

	const setMode = (next: SkillsMode) => {
		mode = next;
		stage.dataset.skillsMode = next;
	};

	const clearDynamicBodies = () => {
		bodyToEl.forEach((el) => {
			el.removeAttribute("data-active");
			el.style.transform = "translate(-9999px, -9999px)";
		});
		bodyToEl.clear();

		Composite.allBodies(engine.world)
			.filter((body) => body.label === "pill")
			.forEach((body) => Composite.remove(engine.world, body));
	};

	const spawnAll = () => {
		clearDynamicBodies();
		setMode("falling");

		items.forEach((item, index) => {
			const el = capsules[index];
			if (!el) return;

			const x = width * (0.12 + Math.random() * 0.76);
			const y = -80 - index * (48 + Math.random() * 24);
			const body = createPill(x, y, el);
			Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.12);
			Composite.add(engine.world, body);
		});

		syncDom();
	};

	const arrangeGrid = () => {
		const pillBodies = Composite.allBodies(engine.world).filter((body) => body.label === "pill");
		if (pillBodies.length === 0) return;

		const cols = getColumnCount();
		const entries = pillBodies
			.map((body) => {
				const el = bodyToEl.get(body.id);
				if (!el) return null;
				return { body, el, ...getCapsuleSize(el), index: capsules.indexOf(el) };
			})
			.filter((entry): entry is NonNullable<typeof entry> => entry !== null)
			.sort((a, b) => a.index - b.index);

		const rows: (typeof entries)[] = [];
		for (let i = 0; i < entries.length; i += cols) {
			rows.push(entries.slice(i, i + cols));
		}

		const rowHeights = rows.map((row) => Math.max(...row.map((entry) => entry.height)));
		const totalHeight = rowHeights.reduce(
			(sum, rowHeight, index) => sum + rowHeight + (index > 0 ? GRID_GAP_Y : 0),
			0,
		);

		let rowTop = height - GRID_PADDING_BOTTOM - totalHeight;

		rows.forEach((row, rowIndex) => {
			const rowHeight = rowHeights[rowIndex];
			const rowWidth = row.reduce(
				(sum, entry, index) => sum + entry.width + (index > 0 ? GRID_GAP_X : 0),
				0,
			);
			let xCursor = (width - rowWidth) / 2;

			row.forEach((entry) => {
				const x = xCursor + entry.width / 2;
				const y = rowTop + rowHeight / 2;

				Body.setStatic(entry.body, true);
				Body.setPosition(entry.body, { x, y });
				Body.setAngle(entry.body, 0);
				Body.setVelocity(entry.body, { x: 0, y: 0 });
				Body.setAngularVelocity(entry.body, 0);

				xCursor += entry.width + GRID_GAP_X;
			});

			rowTop += rowHeight + GRID_GAP_Y;
		});

		setMode("arranged");
		syncDom();
	};

	const rebuildWorld = () => {
		const bounds = getBounds();
		width = Math.max(Math.floor(bounds.width), 1);
		height = Math.max(Math.floor(bounds.height), 1);

		Composite.allBodies(engine.world)
			.filter((body) => body.label === "wall")
			.forEach((body) => Composite.remove(engine.world, body));

		Composite.add(engine.world, buildWalls());
	};

	const refreshLayout = () => {
		rebuildWorld();
		if (!hasStarted) return;

		if (mode === "arranged") arrangeGrid();
		else spawnAll();
	};

	const startAnimation = () => {
		if (hasStarted) return;
		hasStarted = true;
		spawnAll();
		observer?.disconnect();
		observer = null;
	};

	runner = Runner.create();
	Runner.run(runner, engine);

	mouse = Mouse.create(stage);
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

	const onStartDrag = (event: Matter.IEvent<Matter.MouseConstraint>) => {
		if (mode === "arranged") return;

		const body = event.source.body;
		if (!body || body.label !== "pill") return;
		Body.setVelocity(body, { x: 0, y: 0 });
		Body.setAngularVelocity(body, 0);
	};

	const onAfterUpdate = () => {
		syncDom();

		if (mode === "arranged") {
			stage.style.cursor = "default";
			return;
		}

		const pillBodies = Composite.allBodies(engine.world).filter((body) => body.label === "pill");

		if (mouseConstraint.body) {
			stage.style.cursor = "grabbing";
			return;
		}

		if (Query.point(pillBodies, mouse.position).length > 0) {
			stage.style.cursor = "pointer";
			return;
		}

		stage.style.cursor = "default";
	};

	Events.on(mouseConstraint, "startdrag", onStartDrag);
	Events.on(engine, "afterUpdate", onAfterUpdate);

	const onResize = () => refreshLayout();
	window.addEventListener("resize", onResize);

	observer = new IntersectionObserver(
		([entry]) => {
			if (entry.isIntersecting) startAnimation();
		},
		{ threshold: 0.15 },
	);
	observer.observe(section);

	const ready = document.fonts?.ready ?? Promise.resolve();
	const init = ready.then(() => rebuildWorld());

	return {
		toggleArrange: () => {
			if (!hasStarted) return;

			if (mode === "arranged") spawnAll();
			else arrangeGrid();
		},
		destroy: () => {
			void init;
			observer?.disconnect();
			window.removeEventListener("resize", onResize);
			Events.off(mouseConstraint, "startdrag", onStartDrag);
			Events.off(engine, "afterUpdate", onAfterUpdate);
			Runner.stop(runner);
			clearDynamicBodies();
			Engine.clear(engine);
			stage.style.cursor = "default";
			delete stage.dataset.skillsMode;
		},
	};
}

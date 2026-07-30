import Matter from "matter-js";
import { TECH_LANGUAGES, type TechLanguage } from "../data/techLanguages";

const { Engine, Runner, Bodies, Body, Composite, Events, Mouse, MouseConstraint, Query } = Matter;

type SkillsMode = "falling" | "arranged";

type MatterMouse = Matter.Mouse & {
	mousewheel: (event: WheelEvent) => void;
	mousemove: (event: MouseEvent | TouchEvent) => void;
	mousedown: (event: MouseEvent | TouchEvent) => void;
	mouseup: (event: MouseEvent | TouchEvent) => void;
	sourceEvents: {
		mousemove: Event | null;
		mousedown: Event | null;
		mouseup: Event | null;
		mousewheel: Event | null;
	};
};

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

	const measureCapsule = (el: HTMLElement) => {
		el.removeAttribute("data-active");
		el.style.transform = "translate(-9999px, -9999px)";
		const { width: pillWidth, height: pillHeight } = el.getBoundingClientRect();
		return {
			width: Math.max(pillWidth, 1),
			height: Math.max(pillHeight, 1),
		};
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
		if (mode !== "falling") return;

		for (const body of Composite.allBodies(engine.world)) {
			if (body.label !== "pill") continue;
			const el = bodyToEl.get(body.id);
			if (!el) continue;

			const { x, y } = body.position;
			el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${body.angle}rad)`;
		}
	};

	const catalog = section.querySelector<HTMLElement>("[data-skills-catalog]");

	const setMode = (next: SkillsMode) => {
		mode = next;
		section.dataset.skillsMode = next;

		if (next === "arranged") catalog?.removeAttribute("hidden");
		else catalog?.setAttribute("hidden", "");
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

		// Wait for section to reflow after leaving arranged mode
		requestAnimationFrame(() => {
			rebuildWorld();

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
		});
	};

	const showCatalog = () => {
		clearDynamicBodies();
		setMode("arranged");
	};

	setMode("falling");

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

		if (mode === "arranged") showCatalog();
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
	const matterMouse = mouse as MatterMouse;
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

	// Matter.js prevents wheel/touch scroll on the stage by default — keep drag, allow scroll
	stage.removeEventListener("wheel", matterMouse.mousewheel);

	const setMouseFromTouch = (event: TouchEvent) => {
		const touch = event.touches[0] ?? event.changedTouches[0];
		if (!touch) return;

		const rect = stage.getBoundingClientRect();
		const ratio = mouse.pixelRatio || 1;
		mouse.absolute.x = (touch.clientX - rect.left) * ratio;
		mouse.absolute.y = (touch.clientY - rect.top) * ratio;
		mouse.position.x = mouse.absolute.x * mouse.scale.x + mouse.offset.x;
		mouse.position.y = mouse.absolute.y * mouse.scale.y + mouse.offset.y;
	};

	const pillAtPointer = () =>
		Query.point(
			Composite.allBodies(engine.world).filter((body) => body.label === "pill"),
			mouse.position,
		).length > 0;

	const onTouchStart = (event: TouchEvent) => {
		if (mode !== "falling") return;

		setMouseFromTouch(event);
		mouse.button = 0;
		mouse.mousedownPosition.x = mouse.position.x;
		mouse.mousedownPosition.y = mouse.position.y;
		matterMouse.sourceEvents.mousedown = event;

		if (pillAtPointer()) event.preventDefault();
	};

	const onTouchMove = (event: TouchEvent) => {
		if (mode !== "falling") return;

		setMouseFromTouch(event);
		matterMouse.sourceEvents.mousemove = event;

		if (mouseConstraint.body) event.preventDefault();
	};

	const onTouchEnd = (event: TouchEvent) => {
		if (mode !== "falling") return;

		setMouseFromTouch(event);
		mouse.button = -1;
		mouse.mouseupPosition.x = mouse.position.x;
		mouse.mouseupPosition.y = mouse.position.y;
		matterMouse.sourceEvents.mouseup = event;
	};

	stage.removeEventListener("touchmove", matterMouse.mousemove);
	stage.removeEventListener("touchstart", matterMouse.mousedown);
	stage.removeEventListener("touchend", matterMouse.mouseup);
	stage.addEventListener("touchstart", onTouchStart, { passive: false });
	stage.addEventListener("touchmove", onTouchMove, { passive: false });
	stage.addEventListener("touchend", onTouchEnd, { passive: true });
	stage.addEventListener("touchcancel", onTouchEnd, { passive: true });

	const onStartDrag = (event: Matter.IEvent<Matter.MouseConstraint>) => {
		if (mode !== "falling") return;

		const body = event.source.body;
		if (!body || body.label !== "pill") return;
		Body.setVelocity(body, { x: 0, y: 0 });
		Body.setAngularVelocity(body, 0);
	};

	const onAfterUpdate = () => {
		if (mode !== "falling") {
			stage.style.cursor = "default";
			return;
		}

		syncDom();

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
			else showCatalog();
		},
		destroy: () => {
			void init;
			observer?.disconnect();
			window.removeEventListener("resize", onResize);
			stage.removeEventListener("touchstart", onTouchStart);
			stage.removeEventListener("touchmove", onTouchMove);
			stage.removeEventListener("touchend", onTouchEnd);
			stage.removeEventListener("touchcancel", onTouchEnd);
			Events.off(mouseConstraint, "startdrag", onStartDrag);
			Events.off(engine, "afterUpdate", onAfterUpdate);
			Runner.stop(runner);
			clearDynamicBodies();
			Engine.clear(engine);
			stage.style.cursor = "default";
			delete section.dataset.skillsMode;
		},
	};
}

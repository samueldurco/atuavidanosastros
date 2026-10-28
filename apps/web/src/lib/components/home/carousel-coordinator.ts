// A single scheduler across the home: only one visible, unblocked banner moves at a time.
type Playback = 'paused' | 'playing' | 'waiting';
interface Registration {
	el: HTMLElement;
	count: number;
	blocked: boolean;
	advance: () => void;
	playback: (state: Playback, reduced: boolean) => void;
}
type Banner = Registration & {
	paused: boolean;
	visible: boolean;
	reduced: boolean;
	steps: number;
	timer?: ReturnType<typeof setTimeout>;
};
const banners = new Set<Banner>();
let owner: Banner | undefined;
const stop = (banner: Banner) => {
	clearTimeout(banner.timer);
	banner.timer = undefined;
};
function reconcile(preferred?: Banner) {
	const eligible = (banner: Banner) =>
		banner.visible &&
		!banner.paused &&
		!banner.reduced &&
		!banner.blocked &&
		!document.hidden &&
		banner.count > 1;
	owner =
		preferred && eligible(preferred)
			? preferred
			: owner && banners.has(owner) && eligible(owner)
				? owner
				: [...banners].find(eligible);
	for (const banner of banners) {
		banner.playback(
			banner.paused || banner.reduced ? 'paused' : banner === owner ? 'playing' : 'waiting',
			banner.reduced
		);
		if (banner !== owner) stop(banner);
	}
	if (owner && !owner.timer) {
		const banner = owner;
		banner.timer = setTimeout(() => {
			banner.timer = undefined;
			banner.advance();
			if (++banner.steps >= banner.count) banner.paused = true;
			reconcile();
		}, 9000);
	}
}
export function registerHomeCarousel(registration: Registration) {
	const media = matchMedia('(prefers-reduced-motion: reduce)');
	const banner: Banner = {
		...registration,
		paused: media.matches,
		reduced: media.matches,
		visible: false,
		steps: 0
	};
	banners.add(banner);
	const pause = () => {
		banner.paused = true;
		stop(banner);
		reconcile();
	};
	const observer = new IntersectionObserver(
		([entry]) => {
			const wasVisible = banner.visible;
			banner.visible = entry.intersectionRatio >= 0.35;
			if (wasVisible && !banner.visible) banner.paused = true;
			reconcile();
		},
		{ threshold: [0, 0.35, 0.55, 1] }
	);
	observer.observe(banner.el);
	const visibility = () => {
		if (document.hidden) banner.paused = true;
		reconcile();
	};
	const motion = () => {
		banner.reduced = media.matches;
		if (media.matches) banner.paused = true;
		reconcile();
	};
	document.addEventListener('visibilitychange', visibility);
	media.addEventListener('change', motion);
	reconcile();
	return {
		pause,
		toggle() {
			banner.paused = !banner.paused;
			banner.steps = 0;
			stop(banner);
			reconcile(banner);
		},
		setBlocked(blocked: boolean) {
			banner.blocked = blocked;
			reconcile();
		},
		destroy() {
			stop(banner);
			banners.delete(banner);
			observer.disconnect();
			document.removeEventListener('visibilitychange', visibility);
			media.removeEventListener('change', motion);
			reconcile();
		}
	};
}

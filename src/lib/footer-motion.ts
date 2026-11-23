/**
 * Footer motion: a horizontal wordmark carousel, an intro waterfall, and
 * vertical slot-reel spins triggered by the pointer.
 *
 * The markup lives in the `(app)` layout. This module only touches the elements
 * it receives, so the animation can be read without the whole page around it.
 *
 * Reading order:
 * 1. `setupFooterMotion` — the recipe that connects the pieces.
 * 2. `createReveal`, `createCarousel`, `createWaterfall` — the load sequence.
 * 3. `createReelSpinner`, `createPointerTracker` — the hover behavior.
 */
import gsap from 'gsap';
import { ScrollTrigger, SplitText } from 'gsap/all';

/**
 * The words that pass through one reel during a spin.
 *
 * The first and last are the same on purpose: a spin starts and ends on the
 * brand, so resetting the strip for the next spin is invisible.
 */
export const reelWords = ['INTERNERY', 'HIRING', 'SHIFTS', 'STUDENT', 'INTERNERY'];

/** How far one spin moves the strip, as a percentage of its full height. */
// Five words means one spin travels four copies: 4 / 5 = 80% of the strip.
const reelSpinStart = -((reelWords.length - 1) / reelWords.length) * 100;

/** The elements the footer animation needs from the page. */
export type FooterMotionTargets = {
	section: HTMLElement;
	track: HTMLElement;
};

/**
 * Starts the footer animation.
 *
 * Call this from `onMount`, after the footer is in the DOM. It returns a
 * cleanup function that stops the animations and restores the split text.
 */
export function setupFooterMotion({ section, track }: FooterMotionTargets): () => void {
	// The plugins must be registered with the gsap instance that creates the
	// animations. Doing it here keeps module import free of browser side effects.
	gsap.registerPlugin(ScrollTrigger, SplitText);

	const leadWords = findLeadWords(track);
	const split = SplitText.create(leadWords, {
		type: 'chars',
		charsClass: 'footer-char'
	});

	const context = gsap.context(() => {
		// A context collects every tween, timeline and ScrollTrigger created inside
		// it, so the cleanup below can undo all of them in one call.
		const reveal = createReveal(section);
		const carousel = createCarousel(track);
		const waterfall = createWaterfall(split.chars);
		const spinReel = createReelSpinner();
		const stopPointerTracking = createPointerTracker(section, spinReel);

		startWhenVisible(section, () => {
			reveal.play();
			carousel.play();
			waterfall.play();
		});

		return stopPointerTracking;
	}, section);

	return () => {
		context.revert();
		split.revert();
	};
}

/**
 * Returns the resting copy of each reel.
 *
 * The other copies exist only to feed the vertical spin, so the intro
 * waterfall does not need to split them as well.
 */
function findLeadWords(track: HTMLElement): Element[] {
	return Array.from(track.querySelectorAll('.footer-word--lead'));
}

/** Slides the whole footer section up when it first enters the viewport. */
function createReveal(section: HTMLElement): gsap.core.Tween {
	return gsap.from(section, {
		y: 80,
		scale: 0.98,
		opacity: 0,
		duration: 0.9,
		ease: 'power3.out',
		paused: true
	});
}

/**
 * Moves the wordmark sideways forever.
 *
 * The track holds two identical halves. Shifting it by exactly -50% puts the
 * second half where the first one started, so the loop has no visible seam.
 */
function createCarousel(track: HTMLElement): gsap.core.Tween {
	return gsap.to(track, {
		xPercent: -50,
		duration: 20,
		ease: 'none',
		repeat: -1,
		paused: true
	});
}

/**
 * Drops the intro characters in from above.
 *
 * The timeline runs twice and then changes itself into a one-shot, so the
 * footer settles instead of falling forever.
 */
function createWaterfall(chars: Element[]): gsap.core.Timeline {
	const timeline = gsap.timeline({
		paused: true,
		repeat: 1,
		repeatDelay: 0.5
	});

	timeline.fromTo(
		chars,
		{ yPercent: -120, opacity: 0 },
		{
			yPercent: 0,
			opacity: 1,
			duration: 0.7,
			ease: 'power3.out',
			stagger: { each: 0.018, from: 'start' }
		}
	);

	timeline.eventCallback('onComplete', () => timeline.repeat(0));

	return timeline;
}

/** Runs `start` the first time the footer reaches the viewport. */
function startWhenVisible(section: HTMLElement, start: () => void): void {
	ScrollTrigger.create({
		trigger: section,
		start: 'top bottom',
		once: true,
		onEnter: start
	});
}

/**
 * Creates the function that spins one reel.
 *
 * Each reel remembers its own spin, so a reel that is already moving cannot be
 * restarted halfway through.
 */
function createReelSpinner(): (reel: Element) => void {
	const spinsByReel = new WeakMap<Element, gsap.core.Tween>();

	return function spinReel(reel: Element): void {
		const reelTrack = reel.querySelector('.footer-reel-track');

		if (!reelTrack || spinsByReel.get(reel)?.isActive()) {
			return;
		}

		const spin = gsap.fromTo(
			reelTrack,
			{ yPercent: reelSpinStart },
			{
				yPercent: 0,
				duration: 1.6,
				ease: 'power2.out',
				overwrite: true
			}
		);

		spinsByReel.set(reel, spin);
	};
}

/**
 * Watches the pointer while it is over the footer.
 *
 * A pointer can stay still while the carousel moves a new reel underneath it,
 * so this checks the real element under the pointer on every frame instead of
 * waiting for pointerenter on each reel. The returned function stops watching
 * and removes the listeners.
 */
function createPointerTracker(section: HTMLElement, spinReel: (reel: Element) => void): () => void {
	let pointerX = 0;
	let pointerY = 0;
	let isTracking = false;
	let activeReel: Element | null = null;
	let animationFrameId = 0;

	function stopTracking(): void {
		isTracking = false;
		activeReel = null;

		if (animationFrameId !== 0) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = 0;
		}
	}

	function checkWhatIsUnderPointer(): void {
		if (!isTracking) {
			return;
		}

		if (!isInsideSection(section, pointerX, pointerY)) {
			stopTracking();
			return;
		}

		const reel = findReelAtPoint(pointerX, pointerY);

		if (reel !== activeReel) {
			activeReel = reel;

			if (reel) {
				spinReel(reel);
			}
		}

		animationFrameId = requestAnimationFrame(checkWhatIsUnderPointer);
	}

	function onPointerMove(event: PointerEvent): void {
		pointerX = event.clientX;
		pointerY = event.clientY;

		if (!isTracking) {
			isTracking = true;
			animationFrameId = requestAnimationFrame(checkWhatIsUnderPointer);
		}
	}

	section.addEventListener('pointerenter', onPointerMove);
	section.addEventListener('pointermove', onPointerMove);
	section.addEventListener('pointerleave', stopTracking);

	return function stopPointerTracking(): void {
		section.removeEventListener('pointerenter', onPointerMove);
		section.removeEventListener('pointermove', onPointerMove);
		section.removeEventListener('pointerleave', stopTracking);
		stopTracking();
	};
}

/** True when the pointer is still inside the footer. */
function isInsideSection(section: HTMLElement, x: number, y: number): boolean {
	const bounds = section.getBoundingClientRect();

	return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
}

/** Returns the reel under the pointer, or null when the pointer is between reels. */
function findReelAtPoint(x: number, y: number): Element | null {
	const element = document.elementFromPoint(x, y);

	return element?.closest('.footer-reel') ?? null;
}

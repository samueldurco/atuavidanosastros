import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerHomeCarousel } from './carousel-coordinator';

const intersections = new Map<Element, IntersectionObserverCallback>();
const controllers: ReturnType<typeof registerHomeCarousel>[] = [];
let page: EventTarget & { hidden: boolean };
let motion: EventTarget & { matches: boolean };

function banner() {
	const el = {} as HTMLElement;
	const advance = vi.fn();
	const playback = vi.fn();
	const control = registerHomeCarousel({ el, count: 3, blocked: false, advance, playback });
	controllers.push(control);
	return { el, advance, playback, control };
}

function visible(el: Element, ratio: number) {
	intersections.get(el)!(
		[{ target: el, intersectionRatio: ratio } as IntersectionObserverEntry],
		{} as IntersectionObserver
	);
}

beforeEach(() => {
	vi.useFakeTimers();
	page = Object.assign(new EventTarget(), { hidden: false });
	motion = Object.assign(new EventTarget(), { matches: false });
	vi.stubGlobal('document', page);
	vi.stubGlobal('matchMedia', () => motion);
	vi.stubGlobal(
		'IntersectionObserver',
		class {
			constructor(private callback: IntersectionObserverCallback) {}
			observe(el: Element) {
				intersections.set(el, this.callback);
			}
			disconnect() {}
		}
	);
});

afterEach(() => {
	controllers.splice(0).forEach((controller) => controller.destroy());
	intersections.clear();
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('home banner movement contract', () => {
	it('waits nine seconds per transition, completes one cycle and only resumes explicitly', () => {
		const item = banner();
		visible(item.el, 1);
		vi.advanceTimersByTime(8999);
		expect(item.advance).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(item.advance).toHaveBeenCalledTimes(1);
		vi.advanceTimersByTime(18000);
		expect(item.advance).toHaveBeenCalledTimes(3);
		expect(item.playback).toHaveBeenLastCalledWith('paused', false);
		vi.advanceTimersByTime(90000);
		expect(item.advance).toHaveBeenCalledTimes(3);
		item.control.toggle();
		vi.advanceTimersByTime(9000);
		expect(item.advance).toHaveBeenCalledTimes(4);
	});

	it('allows only one visible banner to rotate while others retain manual availability', () => {
		const first = banner();
		const second = banner();
		visible(first.el, 1);
		visible(second.el, 1);
		vi.advanceTimersByTime(9000);
		expect(first.advance).toHaveBeenCalledTimes(1);
		expect(second.advance).not.toHaveBeenCalled();
		expect(second.playback).toHaveBeenLastCalledWith('waiting', false);
		first.control.pause();
		vi.advanceTimersByTime(9000);
		expect(first.advance).toHaveBeenCalledTimes(1);
		expect(second.advance).toHaveBeenCalledTimes(1);
	});

	it('pauses outside the visible area and requires explicit resume after reentry', () => {
		const item = banner();
		vi.advanceTimersByTime(9000);
		expect(item.advance).not.toHaveBeenCalled();
		visible(item.el, 1);
		vi.advanceTimersByTime(8000);
		visible(item.el, 0);
		vi.advanceTimersByTime(9000);
		visible(item.el, 1);
		vi.advanceTimersByTime(9000);
		expect(item.advance).not.toHaveBeenCalled();
		item.control.toggle();
		vi.advanceTimersByTime(9000);
		expect(item.advance).toHaveBeenCalledTimes(1);
	});

	it('keeps user interaction paused until an explicit playback command', () => {
		const item = banner();
		visible(item.el, 1);
		vi.advanceTimersByTime(8000);
		item.control.pause();
		vi.advanceTimersByTime(27000);
		expect(item.advance).not.toHaveBeenCalled();
		item.control.toggle();
		vi.advanceTimersByTime(8999);
		expect(item.advance).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(item.advance).toHaveBeenCalledTimes(1);
	});

	it('blocks movement while a tool is open and pauses when the tab is hidden', () => {
		const item = banner();
		visible(item.el, 1);
		item.control.setBlocked(true);
		vi.advanceTimersByTime(18000);
		expect(item.advance).not.toHaveBeenCalled();
		item.control.setBlocked(false);
		vi.advanceTimersByTime(9000);
		expect(item.advance).toHaveBeenCalledTimes(1);
		page.hidden = true;
		page.dispatchEvent(new Event('visibilitychange'));
		vi.advanceTimersByTime(18000);
		page.hidden = false;
		page.dispatchEvent(new Event('visibilitychange'));
		vi.advanceTimersByTime(9000);
		expect(item.advance).toHaveBeenCalledTimes(1);
		item.control.toggle();
		vi.advanceTimersByTime(9000);
		expect(item.advance).toHaveBeenCalledTimes(2);
	});

	it('starts with reduced motion paused and prevents automatic rotation', () => {
		motion.matches = true;
		const item = banner();
		visible(item.el, 1);
		vi.advanceTimersByTime(90000);
		expect(item.advance).not.toHaveBeenCalled();
		expect(item.playback).toHaveBeenLastCalledWith('paused', true);
		item.control.toggle();
		vi.advanceTimersByTime(9000);
		expect(item.advance).not.toHaveBeenCalled();
	});
});

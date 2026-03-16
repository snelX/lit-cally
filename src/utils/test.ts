import { LitElement } from "lit";
import { page, userEvent } from "vitest/browser";
import type { CalendarDate } from "../calendar-date/calendar-date.js";
import type { CalendarMonth } from "../calendar-month/calendar-month.js";
import type { CalendarRange } from "../calendar-range/calendar-range.js";

async function nextFrame() {
	return new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
}

type SpySubject = (...args: any[]) => any;

export async function sendShiftPress(key: string) {
	await userEvent.keyboard("{Shift>}");
	await userEvent.keyboard(`{${key}}`);
	await userEvent.keyboard("{/Shift}");
}

/**
 * Creates a spy for use in tests.
 */
export function createSpy<T extends SpySubject>(fn?: T) {
	const calls: Parameters<T>[] = [];

	function spy(...args: Parameters<T>): ReturnType<T> {
		calls.push(args);
		return fn?.(...args);
	}

	Object.defineProperties(spy, {
		calls: { get: () => calls },
		called: { get: () => calls.length > 0 },
		count: { get: () => calls.length },
		first: { get: () => calls[0] },
		last: { get: () => calls[calls.length - 1] }
	});

	return spy as {
		(...args: Parameters<T>): ReturnType<T>;
		readonly calls: Parameters<T>[];
		readonly called: boolean;
		readonly count: number;
		readonly first: Parameters<T>;
		readonly last: Parameters<T>;
	};
}

export type MonthInstance = CalendarMonth;
export type CalendarInstance = CalendarDate | CalendarRange;

/**
 * Creates a custom element, sets its properties, appends children, and adds it to the DOM.
 * Replaces atomico/test-dom fixture.
 */
export async function mount<T extends LitElement>(tagName: string, props: Record<string, any> = {}, children: HTMLElement[] = []): Promise<T> {
	const el = document.createElement(tagName) as T;

	for (const [key, value] of Object.entries(props)) {
		console.log(`---1. Setting property ${key} to ${value}`);
		if (key.startsWith("on")) {
			// event listener: onchange -> change, onfocusday -> focusday
			console.log(`---1.1. Setting event listener ${key} to ${value}`);
			el.addEventListener(key.slice(2), value as EventListener);
		} else if (typeof value === "function" || (typeof value === "object" && value !== null && !Array.isArray(value))) {
			// complex property - set directly
			console.log(`---1.2. Setting complex property ${key} to ${value}`);
			(el as any)[key] = value;
		} else if (typeof value === "boolean") {
			console.log(`---1.3. Setting boolean property ${key} to ${value}`);
			if (value) {
				el.setAttribute(key, "");
			}
			(el as any)[key] = value;
		} else if (value !== undefined && value !== null) {
			console.log(`---1.4. Setting attribute property ${key} to ${value}`);
			el.setAttribute(key, String(value));
		} else {
			console.log(`---1.5. Setting direct property ${key} to ${value}`);
			(el as any)[key] = value;
		}
	}

	for (const child of children) {
		el.appendChild(child);
	}

	document.body.appendChild(el);
	await el.updateComplete;
	await nextFrame();

	return el;
}

/**
 * Helper to create a child element with properties.
 */
export function createElement(tagName: string, props: Record<string, any> = {}, children: HTMLElement[] = []): HTMLElement {
	const el = document.createElement(tagName);

	for (const [key, value] of Object.entries(props)) {
		if (typeof value === "boolean") {
			if (value) el.setAttribute(key, "");
			(el as any)[key] = value;
		} else if (value !== undefined && value !== null) {
			el.setAttribute(key, String(value));
		}
	}

	for (const child of children) {
		el.appendChild(child);
	}

	return el;
}

export function getMonths(calendar: HTMLElement): MonthInstance[] {
	return [...Array.from(calendar.querySelectorAll<MonthInstance>("calendar-month"))!];
}

export function getMonth(calendar: HTMLElement): MonthInstance {
	return getMonths(calendar)[0]!;
}

export function getGrid(month: MonthInstance): HTMLTableElement {
	return month.shadowRoot!.querySelector(`[part="table"]`)!;
}

export function getCalendarVisibleHeading(calendar: CalendarInstance) {
	const slot = calendar.shadowRoot!.querySelector(`[part=heading]`);
	const heading = slot?.querySelector<HTMLElement>(`[aria-hidden]`);

	if (!heading) {
		throw new Error("Could not find visible heading for calendar");
	}

	return page.elementLocator(heading);
}

export function getCalendarHeading(calendar: CalendarInstance) {
	const group = calendar.shadowRoot!.querySelector(`[role="group"]`)!;

	const labelledById = group.getAttribute("aria-labelledby");
	if (!labelledById) {
		throw new Error("No aria-labelledby attribute found on group");
	}

	const heading = calendar.shadowRoot!.getElementById(labelledById);
	if (!heading) {
		throw new Error("No heading found for calendar");
	}

	return page.elementLocator(heading);
}

export function getMonthHeading(month: MonthInstance) {
	const table = getGrid(month);

	const labelledById = table.getAttribute("aria-labelledby");
	if (!labelledById) {
		throw new Error("No aria-labelledby attribute found on table");
	}

	const heading = month.shadowRoot!.getElementById(labelledById);
	if (!heading) {
		throw new Error("No heading found for month");
	}

	return page.elementLocator(heading);
}

export function getPrevPageButton(calendar: CalendarInstance) {
	const button = calendar.shadowRoot!.querySelector<HTMLButtonElement>(`button[part~="previous"]`)!;
	return page.elementLocator(button);
}

export function getNextPageButton(calendar: CalendarInstance) {
	const button = calendar.shadowRoot!.querySelector<HTMLButtonElement>(`button[part~="next"]`)!;
	return page.elementLocator(button);
}

export function getTodayButton(month: MonthInstance) {
	const button = month.shadowRoot!.querySelector<HTMLButtonElement>(`button[part~="today"]`)!;
	return page.elementLocator(button);
}

export function getSelectedDays(month: MonthInstance) {
	return [...Array.from(month.shadowRoot!.querySelectorAll<HTMLButtonElement>(`button[aria-pressed="true"]`))];
}

export function getDayButton(month: MonthInstance, dateLabel: string) {
	const grid = getGrid(month);

	if (!grid) {
		throw new Error(`No grid found for date: ${dateLabel}`);
	}

	return grid.querySelector<HTMLButtonElement>(`button[aria-label="${dateLabel}"]`)!;
}

export async function clickDay(month: MonthInstance, dateLabel: string, options?: { force?: boolean }) {
	const button = getDayButton(month, dateLabel);

	if (!button) {
		throw new Error(`No button found for date: ${dateLabel}`);
	}

	await page.elementLocator(button).click(options);
}

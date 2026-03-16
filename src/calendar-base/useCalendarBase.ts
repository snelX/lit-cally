import type { ReactiveController, ReactiveControllerHost } from "lit";
import { clamp, getToday, toDate } from "../utils/date.js";
import { createDateFormatter, parseDateProp } from "../utils/hooks.js";
import { PlainDate, PlainYearMonth } from "../utils/temporal.js";

export type Pagination = "single" | "months";

type CalendarBaseOptions = {
	host: ReactiveControllerHost & HTMLElement;
	getMonths: () => number;
	getPageBy: () => Pagination;
	getLocale: () => string | undefined;
	getFocusedDateProp: () => string;
	setFocusedDateProp: (value: string) => void;
	getMin: () => string;
	getMax: () => string;
	getToday: () => string;
};

export interface CalendarFocusOptions extends FocusOptions {
	target?: "day" | "next" | "previous";
}

const formatOptions = { year: "numeric" } as const;
const formatVerboseOptions = { year: "numeric", month: "long" } as const;

function diffInMonths(a: PlainYearMonth, b: PlainYearMonth): number {
	return (b.year - a.year) * 12 + b.month - a.month;
}

const createPage = (start: PlainYearMonth, months: number, pageBy: Pagination = "months") => {
	if (months === 12 && pageBy !== "single") {
		start = new PlainYearMonth(start.year, 1);
	}
	return {
		start,
		end: start.add({ months: months - 1 })
	};
};

export class CalendarBaseController implements ReactiveController {
	private _page!: { start: PlainYearMonth; end: PlainYearMonth };
	private _focusedDate!: PlainDate;
	private _min?: PlainDate;
	private _max?: PlainDate;
	private _today?: PlainDate;
	private _format!: Intl.DateTimeFormat;
	private _formatVerbose!: Intl.DateTimeFormat;
	private _host: ReactiveControllerHost & HTMLElement;
	private _options: CalendarBaseOptions;
	private _prevFocusedStr = "";
	private _prevPageStartStr = "";

	constructor(options: CalendarBaseOptions) {
		this._host = options.host;
		this._options = options;
		this._host.addController(this);
	}

	get page() {
		return this._page;
	}

	get focusedDate() {
		return this._focusedDate;
	}

	get min() {
		return this._min;
	}

	get max() {
		return this._max;
	}

	get today() {
		return this._today;
	}

	get format() {
		return this._format;
	}

	get formatVerbose() {
		return this._formatVerbose;
	}

	get next(): (() => void) | undefined {
		const months = this._options.getMonths();
		const step = this._options.getPageBy() === "single" ? 1 : months;
		if (!this._max || !this._contains(this._max)) {
			return () => this._updatePageBy(step);
		}
		return undefined;
	}

	get previous(): (() => void) | undefined {
		const months = this._options.getMonths();
		const step = this._options.getPageBy() === "single" ? 1 : months;
		if (!this._min || !this._contains(this._min)) {
			return () => this._updatePageBy(-step);
		}
		return undefined;
	}

	private _contains(date: PlainDate): boolean {
		const months = this._options.getMonths();
		const diff = diffInMonths(this._page.start, date.toPlainYearMonth());
		return diff >= 0 && diff < months;
	}

	private _updatePageBy(by: number) {
		const months = this._options.getMonths();
		const pageBy = this._options.getPageBy();
		this._page = createPage(this._page.start.add({ months: by }), months, pageBy);
		this._host.requestUpdate();

		// page change -> update focused date
		if (!this._contains(this._focusedDate)) {
			const diff = diffInMonths(this._focusedDate.toPlainYearMonth(), this._page.start);
			this._goto(this._focusedDate.add({ months: diff }));
		}
	}

	hostConnected() {
		const locale = this._options.getLocale();
		this._format = createDateFormatter(formatOptions, locale);
		this._formatVerbose = createDateFormatter(formatVerboseOptions, locale);

		this._min = parseDateProp(this._options.getMin());
		this._max = parseDateProp(this._options.getMax());
		this._today = parseDateProp(this._options.getToday());

		const focusedDateProp = parseDateProp(this._options.getFocusedDateProp());
		const newFocused = clamp(focusedDateProp ?? this._today ?? getToday(), this._min, this._max);

		const months = this._options.getMonths();
		const pageBy = this._options.getPageBy();

		// Initialize page on first run
		if (!this._page) {
			this._page = createPage(newFocused.toPlainYearMonth(), months, pageBy);
			this._focusedDate = newFocused;
			this._prevFocusedStr = newFocused.toString();
			this._prevPageStartStr = this._page.start.toString();
			return;
		}

		// If focused date changed externally, update page
		const newFocusedStr = newFocused.toString();
		if (newFocusedStr !== this._prevFocusedStr) {
			this._focusedDate = newFocused;
			this._prevFocusedStr = newFocusedStr;

			if (!this._contains(newFocused)) {
				const step = pageBy === "single" ? 1 : months;
				const diff = diffInMonths(this._page.start, newFocused.toPlainYearMonth());

				if (diff === -1) {
					this._page = createPage(this._page.start.add({ months: -step }), months, pageBy);
				} else if (diff === months) {
					this._page = createPage(this._page.start.add({ months: step }), months, pageBy);
				} else {
					this._page = createPage(this._page.start.add({ months: Math.floor(diff / months) * months }), months, pageBy);
				}
				this._prevPageStartStr = this._page.start.toString();
			}
		}
	}

	private _goto(date: PlainDate) {
		this._focusedDate = date;
		this._prevFocusedStr = date.toString();
		this._options.setFocusedDateProp(date.toString());
		this._host.dispatchEvent(
			new CustomEvent("focusday", {
				detail: toDate(date),
				bubbles: true,
				composed: true
			})
		);
	}

	onFocus(e: CustomEvent<PlainDate>) {
		e.stopPropagation();
		this._goto(e.detail);
		setTimeout(() => this.focus());
	}

	dispatch() {
		this._host.dispatchEvent(new Event("change", { bubbles: true }));
	}

	focus(options?: CalendarFocusOptions) {
		const target = options?.target ?? "day";
		if (target === "day") {
			this._host.querySelectorAll<HTMLElement>("calendar-month").forEach((m) => m.focus(options));
		} else {
			this._host.shadowRoot!.querySelector<HTMLButtonElement>(`[part~='${target}']`)!.focus(options);
		}
	}
}

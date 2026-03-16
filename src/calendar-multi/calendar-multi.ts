import { provide } from "@lit/context";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { calendarBaseStyles, renderCalendarBase } from "../calendar-base/calendar-base.js";
import type { Pagination } from "../calendar-base/useCalendarBase.js";
import { CalendarBaseController, type CalendarFocusOptions } from "../calendar-base/useCalendarBase.js";
import { calendarContext, CalendarContextValue } from "../calendar-month/CalendarMonthContext.js";
import type { DaysOfWeek } from "../utils/date.js";
import { parseDateMultiProp } from "../utils/hooks.js";
import { PlainDate } from "../utils/temporal.js";

@customElement("calendar-multi")
export class CalendarMulti extends LitElement {
	static styles = calendarBaseStyles;

	@property() value = "";
	@property() min = "";
	@property() max = "";
	@property() today = "";
	@property({ attribute: "focused-date" }) focusedDate = "";
	@property() locale: string | undefined;
	@property({ type: Number }) months = 1;
	@property({ attribute: "page-by" }) pageBy: Pagination = "months";
	@property({ attribute: "first-day-of-week", type: Number }) firstDayOfWeek: DaysOfWeek = 1;
	@property({ attribute: "show-outside-days", type: Boolean }) showOutsideDays = false;
	@property({ attribute: "show-week-numbers", type: Boolean }) showWeekNumbers = false;
	@property({ attribute: "format-weekday" }) formatWeekday: "narrow" | "short" = "narrow";
	@property({ attribute: false }) isDateDisallowed: ((date: Date) => boolean) | undefined;
	@property({ attribute: false }) getDayParts: ((date: Date) => string) | undefined;

	private _calendar = new CalendarBaseController({
		host: this,
		getMonths: () => this.months,
		getPageBy: () => this.pageBy,
		getLocale: () => this.locale,
		getFocusedDateProp: () => this.focusedDate,
		setFocusedDateProp: (v) => {
			this.focusedDate = v;
		},
		getMin: () => this.min,
		getMax: () => this.max,
		getToday: () => this.today
	});

	@provide({ context: calendarContext })
	private _provider?: CalendarContextValue;

	override focus(options?: CalendarFocusOptions) {
		this._calendar.focus(options);
	}

	willUpdate() {
		const value = parseDateMultiProp(this.value);
		this._provider = {
			type: "multi",
			value,
			min: this._calendar.min,
			max: this._calendar.max,
			today: this._calendar.today,
			firstDayOfWeek: this.firstDayOfWeek,
			isDateDisallowed: this.isDateDisallowed,
			getDayParts: this.getDayParts,
			page: this._calendar.page,
			focusedDate: this._calendar.focusedDate,
			showOutsideDays: this.showOutsideDays,
			showWeekNumbers: this.showWeekNumbers,
			locale: this.locale,
			formatWeekday: this.formatWeekday
		};
	}

	private _handleSelect(e: CustomEvent<PlainDate>) {
		const value = parseDateMultiProp(this.value);
		const newValues = [...value];
		const idx = value.findIndex((date) => date.equals(e.detail));
		idx < 0 ? newValues.push(e.detail) : newValues.splice(idx, 1);
		this.value = newValues.join(" ");
		this._calendar.dispatch();
	}

	render() {
		return html` ${renderCalendarBase({
			format: this._calendar.format,
			formatVerbose: this._calendar.formatVerbose,
			pageBy: this.pageBy,
			previous: this._calendar.previous,
			next: this._calendar.next,
			page: this._calendar.page,
			onSelect: (e) => this._handleSelect(e),
			onFocus: (e) => this._calendar.onFocus(e)
		})}`;
	}
}

import { consume, ContextRoot } from "@lit/context";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { calendarContext, type CalendarContextValue } from "../calendar-month/CalendarMonthContext.js";
import { createDateFormatter } from "../utils/hooks.js";
import { PlainYearMonth } from "../utils/temporal.js";
import { renderSelectBase, selectBaseStyles, type MonthOption } from "./calendar-year-month-base.js";

if (!(document.body as any).__litcallyAttached) {
	const root = new ContextRoot();
	root.attach(document.body);
	(document.body as any).__litcallyAttached = true;
}
@customElement("calendar-select-month")
export class CalendarSelectMonth extends LitElement {
	static styles = selectBaseStyles;

	@property({ attribute: "format-month" })
	formatMonth: "long" | "short" = "long";

	@consume({ context: calendarContext, subscribe: true })
	@state()
	private _context!: CalendarContextValue;

	private _getMonthNames(): string[] {
		const formatOptions = { month: this.formatMonth } as const;
		const formatter = createDateFormatter(formatOptions, this._context?.locale);

		const months: string[] = [];
		const day = new Date();
		day.setUTCDate(1);

		for (var i = 0; i < 12; i++) {
			const index = (day.getUTCMonth() + 12) % 12;
			months[index] = formatter.format(day);
			day.setUTCMonth(day.getUTCMonth() + 1);
		}

		return months;
	}

	render() {
		if (!this._context) return html``;

		const { min, max, focusedDate, locale } = this._context;
		const monthNames = this._getMonthNames();
		const focusedYearMonth = focusedDate.toPlainYearMonth();

		const options: MonthOption[] = monthNames.map((label, index) => {
			const i = index + 1;
			const yearMonth = focusedYearMonth.add({ months: i - focusedYearMonth.month });

			const isDisabled = (min != null && PlainYearMonth.compare(yearMonth, min) < 0) || (max != null && PlainYearMonth.compare(yearMonth, max) > 0);

			return {
				label,
				value: `${i}`,
				disabled: isDisabled,
				selected: i === focusedYearMonth.month
			};
		});

		const onChange = (e: Event) => {
			const value = parseInt((e.currentTarget as HTMLSelectElement).value);
			const diff = value - focusedYearMonth.month;
			this.dispatchEvent(
				new CustomEvent("focusday", {
					detail: focusedDate.add({ months: diff }),
					bubbles: true,
					composed: true
				})
			);
		};

		return renderSelectBase({ options, onChange, label: "Month" });
	}
}

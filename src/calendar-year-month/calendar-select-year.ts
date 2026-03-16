import { consume, ContextRoot } from "@lit/context";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { calendarContext, type CalendarContextValue } from "../calendar-month/CalendarMonthContext.js";
import { renderSelectBase, selectBaseStyles, type YearOption } from "./calendar-year-month-base.js";

function times<T>(n: number, fn: (i: number) => T) {
	return Array.from({ length: n }, (_, i) => fn(i));
}
if (!(document.body as any).__litcallyAttached) {
	const root = new ContextRoot();
	root.attach(document.body);
	(document.body as any).__litcallyAttached = true;
}
@customElement("calendar-select-year")
export class CalendarSelectYear extends LitElement {
	static styles = selectBaseStyles;

	@property({ attribute: "max-years", type: Number })
	maxYears = 20;

	@consume({ context: calendarContext, subscribe: true })
	@state()
	private _context!: CalendarContextValue;

	render() {
		if (!this._context) return html``;

		const { min, max, focusedDate } = this._context;
		const focusedYearMonth = focusedDate.toPlainYearMonth();
		const currentYear = focusedYearMonth.year;

		const halfRange = Math.floor(this.maxYears / 2);
		const defaultMin = currentYear - halfRange;
		const defaultMax = currentYear + (this.maxYears - halfRange - 1);

		const minYear = Math.max(defaultMin, min?.year ?? -Infinity);
		const maxYear = Math.min(defaultMax, max?.year ?? Infinity);

		const options: YearOption[] = times(maxYear - minYear + 1, (i) => {
			const year = minYear + i;
			return {
				label: `${year}`,
				value: `${year}`,
				selected: year === focusedYearMonth.year
			};
		});

		const onChange = (e: Event) => {
			const value = parseInt((e.currentTarget as HTMLSelectElement).value);
			const diff = value - focusedYearMonth.year;
			this.dispatchEvent(
				new CustomEvent("focusday", {
					detail: focusedDate.add({ years: diff }),
					bubbles: true,
					composed: true
				})
			);
		};

		return renderSelectBase({ options, onChange, label: "Year" });
	}
}

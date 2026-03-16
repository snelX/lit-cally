import { ContextRoot, consume } from "@lit/context";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { getWeekNumber, toDate } from "../utils/date.js";
import { reset, vh } from "../utils/styles.js";
import type { PlainDate } from "../utils/temporal.js";
import { calendarContext, type CalendarContextValue } from "./CalendarMonthContext.js";
import { computeCalendarMonth } from "./useCalendarMonth.js";
// 1. Primero preparamos la red para atrapar los eventos
if (!(document.body as any).__litcallyAttached) {
	const root = new ContextRoot();
	root.attach(document.body);
	(document.body as any).__litcallyAttached = true;
}

const mapToDayNumber = (firstDayOfWeek: number, i: number) => (i + firstDayOfWeek) % 7;

const dispatchOptions = { bubbles: true, composed: true };

@customElement("calendar-month")
export class CalendarMonth extends LitElement {
	static styles = [
		reset,
		vh,
		css`
			:host {
				--color-accent: black;
				--color-text-on-accent: white;

				display: flex;
				flex-direction: column;
				gap: 0.25rem;
				text-align: center;
				inline-size: fit-content;
			}

			table {
				border-collapse: collapse;
				font-size: 0.875rem;
			}

			th {
				inline-size: 2.25rem;
				block-size: 2.25rem;
			}

			td {
				padding-inline: 0;
			}

			.num {
				font-variant-numeric: tabular-nums;
			}

			button {
				color: inherit;
				font-size: inherit;
				background: transparent;
				border: 0;
				block-size: 2.25rem;
				inline-size: 2.25rem;
			}

			button:hover:where(:not(:disabled, [aria-disabled])) {
				background: #0000000d;
			}

			button:is([aria-pressed="true"], :focus-visible) {
				background: var(--color-accent);
				color: var(--color-text-on-accent);
			}

			button:focus-visible {
				outline: 1px solid var(--color-text-on-accent);
				outline-offset: -2px;
			}

			button:disabled,
			:host::part(outside),
			:host::part(disallowed) {
				cursor: default;
				opacity: 0.5;
			}
		`
	];

	@property({ type: Number })
	offset = 0;

	@consume({ context: calendarContext, subscribe: true })
	@state()
	private _context!: CalendarContextValue;

	override focus() {
		this.shadowRoot!.querySelector<HTMLElement>("button[tabindex='0']")?.focus();
	}

	private _dispatchFocusDay(detail: PlainDate) {
		this.dispatchEvent(new CustomEvent("focusday", { detail, ...dispatchOptions }));
	}

	private _dispatchSelectDay(detail: PlainDate) {
		this.dispatchEvent(new CustomEvent("selectday", { detail, ...dispatchOptions }));
	}

	private _dispatchHoverDay(detail: PlainDate) {
		this.dispatchEvent(new CustomEvent("hoverday", { detail, ...dispatchOptions }));
	}

	render() {
		if (!this._context) return html`No context`;

		const calendar = computeCalendarMonth({
			offset: this.offset,
			context: this._context,
			dispatchFocusDay: (d) => this._dispatchFocusDay(d),
			dispatchSelectDay: (d) => this._dispatchSelectDay(d),
			dispatchHoverDay: (d) => this._dispatchHoverDay(d)
		});

		return html`
			<div id="h" part="heading">${calendar.formatter.format(toDate(calendar.yearMonth))}</div>

			<table aria-labelledby="h" part="table">
				<colgroup>
					${this._context.showWeekNumbers ? html`<col part="col-weeknumber" />` : nothing}
					<col part="col-1" />
					<col part="col-2" />
					<col part="col-3" />
					<col part="col-4" />
					<col part="col-5" />
					<col part="col-6" />
					<col part="col-7" />
				</colgroup>
				<thead>
					<tr part="tr head">
						${this._context.showWeekNumbers
							? html`
									<th part="th weeknumber">
										<slot name="weeknumber">
											<span class="vh">Week</span>
											<span aria-hidden="true">#</span>
										</slot>
									</th>
								`
							: nothing}
						${calendar.daysLong.map(
							(dayName, i) => html`
								<th part="th day day-${mapToDayNumber(this._context.firstDayOfWeek, i)}" scope="col">
									<span class="vh">${dayName}</span>
									<span aria-hidden="true">${calendar.daysVisible[i]}</span>
								</th>
							`
						)}
					</tr>
				</thead>

				<tbody>
					${calendar.weeks.map(
						(week, i) => html`
							<tr part="tr week">
								${this._context.showWeekNumbers ? html` <th class="num" part="th weeknumber" scope="row">${getWeekNumber(week[0])}</th> ` : nothing}
								${week.map((date, j) => {
									const props = calendar.getDayProps(date);
									return html`
										<td part="td">
											${props
												? html`
														<button
															class="num"
															part=${props.part}
															tabindex=${props.tabindex}
															?disabled=${props.disabled}
															aria-disabled=${ifDefined(props.ariaDisabled ? true : undefined)}
															aria-pressed=${ifDefined(props.ariaPressed ? true : undefined)}
															aria-current=${ifDefined(props.ariaCurrent ? true : undefined)}
															aria-label=${props.ariaLabel}
															@keydown=${props.onkeydown}
															@click=${props.onclick}
															@mouseover=${props.onmouseover}
														>
															${date.day}
														</button>
													`
												: nothing}
										</td>
									`;
								})}
							</tr>
						`
					)}
				</tbody>
			</table>
		`;
	}
}

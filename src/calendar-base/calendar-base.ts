import { css, html, nothing, type TemplateResult } from "lit";
import { toDate } from "../utils/date.js";
import { reset, vh } from "../utils/styles.js";
import type { PlainDate, PlainYearMonth } from "../utils/temporal.js";
import type { Pagination } from "./useCalendarBase.js";

interface CalendarBaseProps {
	format: Intl.DateTimeFormat;
	formatVerbose: Intl.DateTimeFormat;
	pageBy: Pagination;
	previous?: () => void;
	next?: () => void;
	onSelect: (e: CustomEvent<PlainDate>) => void;
	onFocus: (e: CustomEvent<PlainDate>) => void;
	onHover?: (e: CustomEvent<PlainDate>) => void;
	page: { start: PlainYearMonth; end: PlainYearMonth };
}

function renderButton(name: string, onclick: (() => void) | undefined, defaultText: string): TemplateResult {
	return html`
		<button part="button ${name} ${!onclick ? "disabled" : ""}" @click=${onclick} aria-disabled=${!onclick ? "true" : "false"}>
			<slot name=${name}>${defaultText}</slot>
		</button>
	`;
}

export function renderCalendarBase(props: CalendarBaseProps): TemplateResult {
	const start = toDate(props.page.start);
	const end = toDate(props.page.end);

	return html`
		<div role="group" aria-labelledby="h" part="container" @selectday=${props.onSelect} @focusday=${props.onFocus} @hoverday=${props.onHover ?? nothing}>
			<div id="h" class="vh" aria-live="polite" aria-atomic="true">${props.formatVerbose.formatRange(start, end)}</div>

			<div part="header">
				${renderButton("previous", props.previous, "Previous")}

				<slot part="heading" name="heading">
					<div aria-hidden="true">${props.format.formatRange(start, end)}</div>
				</slot>

				${renderButton("next", props.next, "Next")}
			</div>

			<slot part="months"></slot>
		</div>
	`;
}

export const calendarBaseStyles = [
	reset,
	vh,
	css`
		:host {
			display: block;
			inline-size: fit-content;
		}

		:host::part(container) {
			display: flex;
			flex-direction: column;
			gap: 1em;
		}

		:host::part(header) {
			display: flex;
			align-items: center;
			justify-content: space-between;
		}

		:host::part(heading) {
			font-weight: bold;
			font-size: 1.25em;
		}

		:host::part(button) {
			display: flex;
			align-items: center;
			justify-content: center;
		}

		:host::part(button disabled) {
			cursor: default;
			opacity: 0.5;
		}
	`
];

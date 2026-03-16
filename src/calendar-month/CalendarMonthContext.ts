import { createContext } from "@lit/context";
import { type DaysOfWeek } from "../utils/date.js";
import type { PlainDate, PlainYearMonth } from "../utils/temporal.js";

interface CalendarContextBase {
	min?: PlainDate;
	max?: PlainDate;
	today?: PlainDate;
	firstDayOfWeek: DaysOfWeek;
	isDateDisallowed?: (date: Date) => boolean;
	getDayParts?: (date: Date) => string;
	page: { start: PlainYearMonth; end: PlainYearMonth };
	focusedDate: PlainDate;
	showOutsideDays?: boolean;
	showWeekNumbers?: boolean;
	locale?: string;
	formatWeekday: "narrow" | "short";
}

export interface CalendarDateContext extends CalendarContextBase {
	type: "date";
	value?: PlainDate;
}

export interface CalendarRangeContext extends CalendarContextBase {
	type: "range";
	value: [PlainDate, PlainDate] | [];
}

export interface CalendarMultiContext extends CalendarContextBase {
	type: "multi";
	value: PlainDate[];
}

export type CalendarContextValue = CalendarDateContext | CalendarRangeContext | CalendarMultiContext;

export const calendarContext = createContext<CalendarContextValue>(Symbol("calendar-context"));

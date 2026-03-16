import { CalendarMonth } from "./calendar-month/calendar-month.js";
import { CalendarDate } from "./calendar-date/calendar-date.js";
import { CalendarSelectYear } from "./calendar-year-month/calendar-select-year.js";
import { CalendarSelectMonth } from "./calendar-year-month/calendar-select-month.js";
import { CalendarRange } from "./calendar-range/calendar-range.js";
import { CalendarMulti } from "./calendar-multi/calendar-multi.js";

export {
  CalendarMonth,
  CalendarDate,
  CalendarRange,
  CalendarMulti,
  CalendarSelectYear,
  CalendarSelectMonth,
};

// export props for use in react/vue/etc
export type CalendarMonthProps = Partial<Omit<CalendarMonth, keyof HTMLElement>>;
export type CalendarDateProps = Partial<Omit<CalendarDate, keyof HTMLElement>>;
export type CalendarRangeProps = Partial<Omit<CalendarRange, keyof HTMLElement>>;
export type CalendarMultiProps = Partial<Omit<CalendarMulti, keyof HTMLElement>>;
export type CalendarSelectYearProps = Partial<Omit<CalendarSelectYear, keyof HTMLElement>>;
export type CalendarSelectMonthProps = Partial<Omit<CalendarSelectMonth, keyof HTMLElement>>;

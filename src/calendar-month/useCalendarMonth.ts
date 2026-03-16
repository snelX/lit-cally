import { createDateFormatter, getDayNames } from "../utils/hooks.js";
import {
  clamp,
  endOfWeek,
  getViewOfMonth,
  startOfWeek,
  toDate,
  getToday,
} from "../utils/date.js";
import type { PlainDate } from "../utils/temporal.js";
import type { CalendarContextValue } from "./CalendarMonthContext.js";

const inRange = (date: PlainDate, min?: PlainDate, max?: PlainDate) =>
  clamp(date, min, max) === date;

const isLTR = (e: Event) => (e.target as HTMLElement).matches(":dir(ltr)");

const dayOptions = { month: "long", day: "numeric" } as const;
const monthOptions = { month: "long" } as const;
const longDayOptions = { weekday: "long" } as const;

type CalendarMonthOptions = {
  offset: number;
  context: CalendarContextValue;
  dispatchFocusDay: (detail: PlainDate) => void;
  dispatchSelectDay: (detail: PlainDate) => void;
  dispatchHoverDay: (detail: PlainDate) => void;
};

export function computeCalendarMonth({ offset, context, dispatchFocusDay, dispatchSelectDay, dispatchHoverDay }: CalendarMonthOptions) {
  const {
    firstDayOfWeek,
    isDateDisallowed,
    min,
    max,
    today,
    page,
    locale,
    focusedDate,
    formatWeekday,
  } = context;

  const todaysDate = today ?? getToday();
  const daysLong = getDayNames(longDayOptions, firstDayOfWeek, locale);
  const visibleDayOptions = { weekday: formatWeekday } as const;
  const daysVisible = getDayNames(visibleDayOptions, firstDayOfWeek, locale);
  const dayFormatter = createDateFormatter(dayOptions, locale);
  const formatter = createDateFormatter(monthOptions, locale);

  const yearMonth = page.start.add({ months: offset });
  const weeks = getViewOfMonth(yearMonth, firstDayOfWeek);

  function focusDay(date: PlainDate) {
    dispatchFocusDay(clamp(date, min, max));
  }

  function onKeyDown(e: KeyboardEvent) {
    let date: PlainDate;

    switch (e.key) {
      case "ArrowRight":
        date = focusedDate.add({ days: isLTR(e) ? 1 : -1 });
        break;
      case "ArrowLeft":
        date = focusedDate.add({ days: isLTR(e) ? -1 : 1 });
        break;
      case "ArrowDown":
        date = focusedDate.add({ days: 7 });
        break;
      case "ArrowUp":
        date = focusedDate.add({ days: -7 });
        break;
      case "PageUp":
        date = focusedDate.add(e.shiftKey ? { years: -1 } : { months: -1 });
        break;
      case "PageDown":
        date = focusedDate.add(e.shiftKey ? { years: 1 } : { months: 1 });
        break;
      case "Home":
        date = startOfWeek(focusedDate, firstDayOfWeek);
        break;
      case "End":
        date = endOfWeek(focusedDate, firstDayOfWeek);
        break;
      default:
        return;
    }

    focusDay(date);
    e.preventDefault();
  }

  function getDayProps(date: PlainDate) {
    const isInMonth = yearMonth.equals(date);

    // days outside of month are only shown if `showOutsideDays` is true
    if (!context.showOutsideDays && !isInMonth) {
      return;
    }

    const isFocusedDay = date.equals(focusedDate);
    const isToday = date.equals(todaysDate);
    const asDate = toDate(date);
    const isDisallowed = isDateDisallowed?.(asDate);
    const isDisabled = !inRange(date, min, max);

    let parts = "";
    let isSelected: boolean | undefined;

    if (context.type === "range") {
      const [start, end] = context.value;
      const isRangeStart = start?.equals(date);
      const isRangeEnd = end?.equals(date);
      isSelected = start && end && inRange(date, start, end);

      // prettier-ignore
      parts = `${
        isRangeStart ? "range-start" : ""
      } ${
        isRangeEnd ? "range-end" : ""
      } ${
        isSelected && !isRangeStart && !isRangeEnd ? "range-inner" : ""
      }`;
    } else if (context.type === "multi") {
      isSelected = context.value.some((d) => d.equals(date));
    } else {
      isSelected = context.value?.equals(date);
    }

    // prettier-ignore
    const commonParts = `button day day-${asDate.getUTCDay()} ${
      // we don't want outside days to ever be shown as selected
      isInMonth ? (isSelected ? "selected" : "") : "outside"
    } ${
      isDisallowed ? "disallowed" : ""
    } ${
      isToday ? "today" : ""
    } ${
      context.getDayParts?.(asDate) ?? ""
    }`;

    return {
      part: `${commonParts} ${parts}`,
      tabindex: isInMonth && isFocusedDay ? 0 : -1,
      disabled: isDisabled,
      ariaDisabled: isDisallowed ? "true" : undefined,
      ariaPressed: isInMonth && isSelected,
      ariaCurrent: isToday ? "date" : undefined,
      ariaLabel: dayFormatter.format(asDate),
      onkeydown: onKeyDown,
      onclick() {
        if (!isDisallowed) {
          dispatchSelectDay(date);
        }
        focusDay(date);
      },
      onmouseover() {
        if (!isDisallowed && !isDisabled) {
          dispatchHoverDay(date);
        }
      },
    };
  }

  return {
    weeks,
    yearMonth,
    daysLong,
    daysVisible,
    formatter,
    getDayProps,
  };
}

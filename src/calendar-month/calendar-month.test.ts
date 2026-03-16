import { ContextProvider } from "@lit/context";
import { afterEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { CalendarMonth } from "../calendar-month/calendar-month.js";
import { getToday, toDate } from "../utils/date.js";
import { PlainDate } from "../utils/temporal.js";
import { clickDay, createSpy, getDayButton, getGrid, getMonthHeading, getSelectedDays, getTodayButton, sendShiftPress, type MonthInstance } from "../utils/test.js";
import { calendarContext, type CalendarContextValue } from "./CalendarMonthContext.js";

async function nextFrame() {
	return new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
}

const isWeekend = (date: Date) => date.getUTCDay() === 0 || date.getUTCDay() === 6;

function getWeekNumbers(month: MonthInstance) {
	const grid = getGrid(month);
	return Array.from(grid.querySelectorAll("tbody tr th"));
}

/**
 * Creates a provider wrapper + calendar-month, mounts to DOM.
 * Returns the CalendarMonth instance.
 */
async function mountWithContext(
	contextValue: Partial<CalendarContextValue> & { focusedDate?: PlainDate },
	extra?: {
		onselectday?: (e: CustomEvent<PlainDate>) => void;
		onfocusday?: (e: CustomEvent<PlainDate>) => void;
		dir?: "rtl" | "ltr";
	}
): Promise<MonthInstance> {
	const focused = contextValue.focusedDate ?? getToday();
	const fullContext: CalendarContextValue = {
		type: "date",
		firstDayOfWeek: 1,
		locale: "en-GB",
		page: {
			start: focused.toPlainYearMonth(),
			end: focused.toPlainYearMonth()
		},
		focusedDate: focused,
		formatWeekday: "narrow",
		...contextValue
	} as CalendarContextValue;

	// Create a wrapper div that provides context
	const wrapper = document.createElement("div");
	if (extra?.dir) {
		wrapper.dir = extra.dir;
	}

	const month = document.createElement("calendar-month") as CalendarMonth;
	wrapper.appendChild(month);
	document.body.appendChild(wrapper);

	// Set up context provider on the wrapper
	const provider = new ContextProvider(wrapper, {
		context: calendarContext,
		initialValue: fullContext
	});

	if (extra?.onselectday) {
		wrapper.addEventListener("selectday", extra.onselectday as EventListener);
	}
	if (extra?.onfocusday) {
		wrapper.addEventListener("focusday", extra.onfocusday as EventListener);
	}

	await month.updateComplete;
	await nextFrame();

	return month;
}

afterEach(() => {
	// Clean up all test elements
	document.querySelectorAll("calendar-month").forEach((el) => el.parentElement?.remove?.() || el.remove());
});

describe("CalendarMonth", () => {
	it("is defined", async () => {
		const calendar = await mountWithContext({});
		expect(calendar).toBeInstanceOf(CalendarMonth);
	});

	describe("value types", () => {
		describe("range", () => {
			it("handles an empty value", async () => {
				const month = await mountWithContext({
					type: "range",
					value: [],
					focusedDate: PlainDate.from("2024-01-01")
				} as any);

				const selected = getSelectedDays(month);
				expect(selected.length).toBe(0);
			});

			it("marks a range as selected", async () => {
				const month = await mountWithContext({
					focusedDate: PlainDate.from("2020-01-01"),
					type: "range",
					value: [PlainDate.from("2020-01-01"), PlainDate.from("2020-01-03")]
				} as any);

				const selected = getSelectedDays(month);
				expect(selected.length).toBe(3);

				await expect.element(page.elementLocator(selected[0]!)).toHaveAttribute("aria-label", "1 January");
				expect(selected[0]!).toHavePart("selected");
				expect(selected[0]!).toHavePart("range-start");

				await expect.element(page.elementLocator(selected[1]!)).toHaveAttribute("aria-label", "2 January");
				expect(selected[1]!).toHavePart("selected");
				expect(selected[1]!).toHavePart("range-inner");

				await expect.element(page.elementLocator(selected[2]!)).toHaveAttribute("aria-label", "3 January");
				expect(selected[2]!).toHavePart("selected");
				expect(selected[2]!).toHavePart("range-end");
			});
		});

		describe("single date", () => {
			it("handles an empty value", async () => {
				const month = await mountWithContext({
					focusedDate: PlainDate.from("2024-01-01")
				});

				const selected = getSelectedDays(month);
				expect(selected.length).toBe(0);
			});

			it("marks a single date as selected", async () => {
				const month = await mountWithContext({
					focusedDate: PlainDate.from("2020-01-01"),
					value: PlainDate.from("2020-01-01")
				} as any);

				const selected = getSelectedDays(month);
				expect(selected.length).toBe(1);
				await expect.element(page.elementLocator(selected[0]!)).toHaveAttribute("aria-label", "1 January");
				expect(selected[0]!).toHavePart("selected");
			});
		});

		describe("multi date", () => {
			it("handles an empty value", async () => {
				const month = await mountWithContext({
					type: "multi",
					value: [],
					focusedDate: PlainDate.from("2024-01-01")
				} as any);

				const selected = getSelectedDays(month);
				expect(selected.length).toBe(0);
			});

			it("marks multiple dates as selected", async () => {
				const month = await mountWithContext({
					focusedDate: PlainDate.from("2020-01-01"),
					type: "multi",
					value: [PlainDate.from("2020-01-01"), PlainDate.from("2020-01-02"), PlainDate.from("2020-01-03")]
				} as any);

				const selected = getSelectedDays(month);
				expect(selected.length).toBe(3);
				await expect.element(page.elementLocator(selected[0]!)).toHaveAttribute("aria-label", "1 January");
				await expect.element(page.elementLocator(selected[1]!)).toHaveAttribute("aria-label", "2 January");
				await expect.element(page.elementLocator(selected[2]!)).toHaveAttribute("aria-label", "3 January");
			});
		});
	});

	describe("a11y/ARIA requirements", () => {
		describe("grid", () => {
			it("is labelled", async () => {
				const month = await mountWithContext({});

				const title = getMonthHeading(month);
				expect(title).not.toBe(undefined);
			});

			it("marks today", async () => {
				const month = await mountWithContext({});

				const todaysDate = toDate(getToday()).toLocaleDateString("en-GB", {
					day: "numeric",
					month: "long",
					timeZone: "UTC"
				});
				const button = getDayButton(month, todaysDate)!;

				expect(button).toHavePart("today");
				await expect.element(page.elementLocator(button)).toHaveAttribute("aria-current", "date");
			});

			it("uses a roving tab index", async () => {
				const month = await mountWithContext({
					focusedDate: PlainDate.from("2020-01-01")
				});
				const grid = getGrid(month);
				const buttons = [...Array.from(grid.querySelectorAll("button"))];

				expect(buttons.every((button) => button.hasAttribute("tabindex"))).toBe(true);

				const focusable = grid.querySelectorAll<HTMLButtonElement>(`[tabindex="0"]`);
				expect(focusable.length).toBe(1);
				await expect.element(page.elementLocator(focusable[0]!)).toHaveTextContent("1");
				await expect.element(page.elementLocator(focusable[0]!)).toHaveAttribute("aria-label", "1 January");
			});
		});
	});

	describe("mouse interaction", () => {
		it("can select a date", async () => {
			const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
			const calendar = await mountWithContext({ focusedDate: PlainDate.from("2020-04-01") }, { onselectday: spy });

			await clickDay(calendar, "19 April");

			expect(spy.count).toBe(1);
			expect(spy.last[0].detail.toString()).toBe("2020-04-19");
		});

		it("cannot select a disallowed date", async () => {
			const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
			const calendar = await mountWithContext(
				{
					focusedDate: PlainDate.from("2020-01-03"),
					isDateDisallowed: isWeekend
				},
				{ onselectday: spy }
			);

			const day = getDayButton(calendar, "4 January")!;
			expect(day).toHavePart("disallowed");
			await expect.element(page.elementLocator(day)).toHaveAttribute("aria-disabled", "true");

			await page.elementLocator(day).click({ force: true });
			expect(spy.called).toBe(false);
		});
	});

	describe("keyboard interaction", () => {
		it("can select a date", async () => {
			const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
			await mountWithContext({ focusedDate: PlainDate.from("2020-04-19") }, { onfocusday: spy });

			await userEvent.keyboard("{Tab}");
			await userEvent.keyboard("{Enter}");

			expect(spy.count).toBe(1);
			expect(spy.last[0].detail.toString()).toBe("2020-04-19");
		});

		it("cannot select a disabled date", async () => {
			const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
			await mountWithContext(
				{
					focusedDate: PlainDate.from("2020-01-04"),
					isDateDisallowed: isWeekend
				},
				{ onselectday: spy }
			);

			await userEvent.keyboard("{Tab}");
			await userEvent.keyboard("{Enter}");

			expect(spy.called).toBe(false);
		});

		it("can move focus to previous day", async () => {
			const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
			await mountWithContext({ focusedDate: PlainDate.from("2020-04-19") }, { onfocusday: spy });

			await userEvent.keyboard("{Tab}");
			await userEvent.keyboard("{ArrowLeft}");

			expect(spy.count).toBe(1);
			expect(spy.last[0].detail.toString()).toBe("2020-04-18");
		});

		it("can move focus to next day ", async () => {
			const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
			await mountWithContext({ focusedDate: PlainDate.from("2020-04-19") }, { onfocusday: spy });

			await userEvent.keyboard("{Tab}");
			await userEvent.keyboard("{ArrowRight}");

			expect(spy.count).toBe(1);
			expect(spy.last[0].detail.toString()).toBe("2020-04-20");
		});

		it("can move focus to previous week", async () => {
			const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
			await mountWithContext({ focusedDate: PlainDate.from("2020-04-19") }, { onfocusday: spy });

			await userEvent.keyboard("{Tab}");
			await userEvent.keyboard("{ArrowUp}");

			expect(spy.count).toBe(1);
			expect(spy.last[0].detail.toString()).toBe("2020-04-12");
		});

		it("can move focus to next week", async () => {
			const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
			await mountWithContext({ focusedDate: PlainDate.from("2020-04-19") }, { onfocusday: spy });

			await userEvent.keyboard("{Tab}");
			await userEvent.keyboard("{ArrowDown}");

			expect(spy.count).toBe(1);
			expect(spy.last[0].detail.toString()).toBe("2020-04-26");
		});

		it("can move focus to start of week", async () => {
			const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
			await mountWithContext({ focusedDate: PlainDate.from("2020-04-16") }, { onfocusday: spy });

			await userEvent.keyboard("{Tab}");
			await userEvent.keyboard("{Home}");

			expect(spy.count).toBe(1);
			expect(spy.last[0].detail.toString()).toBe("2020-04-13");
		});

		it("can move focus to end of week", async () => {
			const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
			await mountWithContext({ focusedDate: PlainDate.from("2020-04-16") }, { onfocusday: spy });

			await userEvent.keyboard("{Tab}");
			await userEvent.keyboard("{End}");

			expect(spy.count).toBe(1);
			expect(spy.last[0].detail.toString()).toBe("2020-04-19");
		});

		it("can move focus to previous month", async () => {
			const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
			await mountWithContext({ focusedDate: PlainDate.from("2020-04-19") }, { onfocusday: spy });

			await userEvent.keyboard("{Tab}");
			await userEvent.keyboard("{PageUp}");

			expect(spy.count).toBe(1);
			expect(spy.last[0].detail.toString()).toBe("2020-03-19");
		});

		it("can move focus to next month", async () => {
			const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
			await mountWithContext({ focusedDate: PlainDate.from("2020-04-19") }, { onfocusday: spy });

			await userEvent.keyboard("{Tab}");
			await userEvent.keyboard("{PageDown}");

			expect(spy.count).toBe(1);
			expect(spy.last[0].detail.toString()).toBe("2020-05-19");
		});

		it("can move focus to previous year", async () => {
			const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
			await mountWithContext({ focusedDate: PlainDate.from("2020-04-19") }, { onfocusday: spy });

			await userEvent.keyboard("{Tab}");
			await sendShiftPress("PageUp");

			expect(spy.count).toBe(1);
			expect(spy.last[0].detail.toString()).toBe("2019-04-19");
		});

		it("can move focus to next year", async () => {
			const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
			await mountWithContext({ focusedDate: PlainDate.from("2020-04-19") }, { onfocusday: spy });

			await userEvent.keyboard("{Tab}");
			await userEvent.keyboard("{Shift>}");
			await userEvent.keyboard("{PageDown}");
			await userEvent.keyboard("{/Shift}");

			expect(spy.count).toBe(1);
			expect(spy.last[0].detail.toString()).toBe("2021-04-19");
		});

		it("can move focus to disabled dates", async () => {
			const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
			await mountWithContext(
				{
					focusedDate: PlainDate.from("2020-01-03"),
					isDateDisallowed: isWeekend
				},
				{ onfocusday: spy }
			);

			await userEvent.keyboard("{Tab}");
			await userEvent.keyboard("{ArrowRight}");

			expect(spy.count).toBe(1);
			expect(spy.last[0].detail.toString()).toBe("2020-01-04");
		});

		it("cannot move focus outside of min/max range", async () => {
			const focused = "2020-01-03";
			const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
			await mountWithContext(
				{
					min: PlainDate.from(focused),
					max: PlainDate.from(focused),
					focusedDate: PlainDate.from(focused)
				},
				{ onfocusday: spy }
			);

			await userEvent.keyboard("{Tab}");
			await userEvent.keyboard("{ArrowLeft}");
			expect(spy.last[0].detail.toString()).toBe(focused);

			await userEvent.keyboard("{ArrowRight}");
			expect(spy.last[0].detail.toString()).toBe(focused);
		});

		describe("RTL", () => {
			it("treats left arrow as next day", async () => {
				const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
				await mountWithContext({ focusedDate: PlainDate.from("2020-04-19") }, { onfocusday: spy, dir: "rtl" });

				await userEvent.keyboard("{Tab}");
				await userEvent.keyboard("{ArrowLeft}");

				expect(spy.count).toBe(1);
				expect(spy.last[0].detail.toString()).toBe("2020-04-20");
			});

			it("treats right arrow as previous day", async () => {
				const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
				await mountWithContext({ focusedDate: PlainDate.from("2020-04-19") }, { onfocusday: spy, dir: "rtl" });

				await userEvent.keyboard("{Tab}");
				await userEvent.keyboard("{ArrowRight}");

				expect(spy.count).toBe(1);
				expect(spy.last[0].detail.toString()).toBe("2020-04-18");
			});
		});
	});

	describe("min/max support", () => {
		it("supports a min date", async () => {
			const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
			const month = await mountWithContext(
				{
					focusedDate: PlainDate.from("2020-01-15"),
					min: PlainDate.from("2020-01-02")
				},
				{ onselectday: spy }
			);

			await clickDay(month, "1 January", { force: true });
			expect(spy.called).toBe(false);

			await clickDay(month, "2 January");

			expect(spy.count).toBe(1);
			expect(spy.last[0].detail.toString()).toBe("2020-01-02");
		});

		it("supports a max date", async () => {
			const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
			const month = await mountWithContext(
				{
					focusedDate: PlainDate.from("2020-01-15"),
					max: PlainDate.from("2020-01-30")
				},
				{ onselectday: spy }
			);

			await clickDay(month, "31 January", { force: true });
			expect(spy.called).toBe(false);

			await clickDay(month, "30 January");

			expect(spy.count).toBe(1);
			expect(spy.last[0].detail.toString()).toBe("2020-01-30");
		});

		it("supports min and max dates", async () => {
			const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
			const month = await mountWithContext(
				{
					focusedDate: PlainDate.from("2020-01-15"),
					min: PlainDate.from("2020-01-02"),
					max: PlainDate.from("2020-01-30")
				},
				{ onselectday: spy }
			);

			await clickDay(month, "1 January", { force: true });
			expect(spy.called).toBe(false);

			await clickDay(month, "31 January", { force: true });
			expect(spy.called).toBe(false);

			await clickDay(month, "30 January");
			expect(spy.count).toBe(1);
			expect(spy.last[0].detail.toString()).toBe("2020-01-30");
		});
	});

	describe("today support", () => {
		it("supports today date", async () => {
			const month = await mountWithContext({
				focusedDate: PlainDate.from("2020-01-01"),
				today: PlainDate.from("2020-01-02")
			});

			const todayButton = getTodayButton(month);
			await expect.element(todayButton).toHaveAttribute("aria-label", "2 January");
		});
	});

	it("can show outside days", async () => {
		const month = await mountWithContext({
			focusedDate: PlainDate.from("2020-04-01"),
			showOutsideDays: true
		});

		const outsideMarch = getDayButton(month, "30 March");
		const outsideMay = getDayButton(month, "3 May");

		expect(outsideMarch).toHavePart("outside");
		expect(outsideMay).toHavePart("outside");
	});

	describe("localization", async () => {
		it("localizes days and months", async () => {
			const month = await mountWithContext({
				focusedDate: PlainDate.from("2020-01-15"),
				locale: "fr-FR"
			});
			const grid = getGrid(month);

			const accessibleHeadings = grid.querySelectorAll("th span:not([aria-hidden])");
			await expect.element(page.elementLocator(accessibleHeadings[0]!)).toHaveTextContent("lundi");
			await expect.element(page.elementLocator(accessibleHeadings[1]!)).toHaveTextContent("mardi");
			await expect.element(page.elementLocator(accessibleHeadings[2]!)).toHaveTextContent("mercredi");
			await expect.element(page.elementLocator(accessibleHeadings[3]!)).toHaveTextContent("jeudi");
			await expect.element(page.elementLocator(accessibleHeadings[4]!)).toHaveTextContent("vendredi");
			await expect.element(page.elementLocator(accessibleHeadings[5]!)).toHaveTextContent("samedi");
			await expect.element(page.elementLocator(accessibleHeadings[6]!)).toHaveTextContent("dimanche");

			const visualHeadings = grid.querySelectorAll("th span[aria-hidden='true']");
			await expect.element(page.elementLocator(visualHeadings[0]!)).toHaveTextContent("L");
			await expect.element(page.elementLocator(visualHeadings[1]!)).toHaveTextContent("M");
			await expect.element(page.elementLocator(visualHeadings[2]!)).toHaveTextContent("M");
			await expect.element(page.elementLocator(visualHeadings[3]!)).toHaveTextContent("J");
			await expect.element(page.elementLocator(visualHeadings[4]!)).toHaveTextContent("V");
			await expect.element(page.elementLocator(visualHeadings[5]!)).toHaveTextContent("S");
			await expect.element(page.elementLocator(visualHeadings[6]!)).toHaveTextContent("D");

			const title = getMonthHeading(month);
			await expect.element(title).toHaveTextContent("janvier");

			const button = getDayButton(month, "15 janvier");
			expect(button).toBeTruthy();
		});

		it("has configurable week day formatting", async () => {
			const month = await mountWithContext({
				focusedDate: PlainDate.from("2020-01-15"),
				formatWeekday: "short"
			});
			const grid = getGrid(month);

			const accessibleHeadings = grid.querySelectorAll("th span:not([aria-hidden])");
			await expect.element(page.elementLocator(accessibleHeadings[0]!)).toHaveTextContent("Monday");
			await expect.element(page.elementLocator(accessibleHeadings[1]!)).toHaveTextContent("Tuesday");
			await expect.element(page.elementLocator(accessibleHeadings[2]!)).toHaveTextContent("Wednesday");
			await expect.element(page.elementLocator(accessibleHeadings[3]!)).toHaveTextContent("Thursday");
			await expect.element(page.elementLocator(accessibleHeadings[4]!)).toHaveTextContent("Friday");
			await expect.element(page.elementLocator(accessibleHeadings[5]!)).toHaveTextContent("Saturday");
			await expect.element(page.elementLocator(accessibleHeadings[6]!)).toHaveTextContent("Sunday");

			const visualHeadings = grid.querySelectorAll("th span[aria-hidden='true']");
			await expect.element(page.elementLocator(visualHeadings[0]!)).toHaveTextContent("Mon");
			await expect.element(page.elementLocator(visualHeadings[1]!)).toHaveTextContent("Tue");
			await expect.element(page.elementLocator(visualHeadings[2]!)).toHaveTextContent("Wed");
			await expect.element(page.elementLocator(visualHeadings[3]!)).toHaveTextContent("Thu");
			await expect.element(page.elementLocator(visualHeadings[4]!)).toHaveTextContent("Fri");
			await expect.element(page.elementLocator(visualHeadings[5]!)).toHaveTextContent("Sat");
			await expect.element(page.elementLocator(visualHeadings[6]!)).toHaveTextContent("Sun");
		});

		it("renders parts for each day corresponding to day number", async () => {
			const mapToDayNumber = (firstDayOfWeek: number, i: number) => (i + firstDayOfWeek) % 7;

			const firstDayOfWeek = 2;
			const month = await mountWithContext({
				focusedDate: PlainDate.from("2020-01-15"),
				firstDayOfWeek
			});
			const grid = getGrid(month);

			const headings = grid.querySelectorAll("th");
			const days = grid.rows[2]!.querySelectorAll("button");

			expect(headings.length).toBe(7);
			expect(days.length).toBe(7);

			for (let i = 0; i < 7; i++) {
				const heading = headings[i]!;
				const day = days[i]!;
				const part = `day-${mapToDayNumber(firstDayOfWeek, i)}`;

				expect(heading).toHavePart(part);
				expect(day).toHavePart(part);
			}
		});
	});

	describe("week numbers", () => {
		it("supports week numbering", async () => {
			const month = await mountWithContext({
				focusedDate: PlainDate.from("2020-04-01"),
				showWeekNumbers: true
			});

			const weekNumbers = getWeekNumbers(month);
			expect(weekNumbers.length).toBe(5);

			let current = 14;
			for (const weekNumber of weekNumbers) {
				expect(weekNumber).toHavePart("th");
				expect(weekNumber).toHavePart("weeknumber");
				await expect.element(page.elementLocator(weekNumber)).toHaveAttribute("scope", "row");
				await expect.element(page.elementLocator(weekNumber)).toHaveTextContent(current.toString());
				current++;
			}
		});

		it("handles year boundary with week 53 correctly", async () => {
			const month = await mountWithContext({
				focusedDate: PlainDate.from("2027-01-01"),
				showWeekNumbers: true,
				firstDayOfWeek: 1
			});

			const weekNumbers = getWeekNumbers(month);
			expect(weekNumbers.length).toBe(5);

			const expectedWeeks = [53, 1, 2, 3, 4];
			for (let i = 0; i < weekNumbers.length; i++) {
				await expect.element(page.elementLocator(weekNumbers[i]!)).toHaveTextContent(expectedWeeks[i]!.toString());
			}
		});

		it("handles year boundary with week 1 starting in previous year", async () => {
			const month = await mountWithContext({
				focusedDate: PlainDate.from("2020-01-01"),
				showWeekNumbers: true,
				firstDayOfWeek: 1
			});

			const weekNumbers = getWeekNumbers(month);

			const expectedWeeks = [1, 2, 3, 4, 5];
			for (let i = 0; i < weekNumbers.length; i++) {
				await expect.element(page.elementLocator(weekNumbers[i]!)).toHaveTextContent(expectedWeeks[i]!.toString());
			}
		});
	});
});

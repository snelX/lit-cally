import { afterEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { clickDay, createElement, createSpy, getDayButton, getMonth, getMonthHeading, getNextPageButton, getPrevPageButton, getSelectedDays, mount } from "../utils/test.js";

import "../calendar-month/calendar-month.js";
import { CalendarRange } from "./calendar-range.js";

async function mountFixture(props: Record<string, any> = {}, children?: HTMLElement[]) {
	const defaultChildren = children ?? [createElement("calendar-month")];
	return mount<CalendarRange>("calendar-range", { locale: "en-GB", ...props }, defaultChildren);
}

afterEach(() => {
	document.querySelectorAll("calendar-range").forEach((el) => el.remove());
});

describe("CalendarRange", () => {
	it("is defined", async () => {
		const calendar = await mountFixture();
		expect(calendar).toBeInstanceOf(CalendarRange);
	});

	describe("mouse interaction", () => {
		it("can select a range: start -> end", async () => {
			const spy = createSpy();
			const calendar = await mountFixture({ value: "2020-01-01/2020-01-01", onchange: spy });
			const month = getMonth(calendar);
			const nextMonth = getNextPageButton(calendar);

			await nextMonth.click();
			await nextMonth.click();
			await nextMonth.click();

			await clickDay(month, "19 April");
			await clickDay(month, "22 April");

			expect(spy.count).toBe(1);
			expect(spy.last[0].target.value).toBe("2020-04-19/2020-04-22");
		});

		it("can select a range: end -> start", async () => {
			const spy = createSpy();
			const calendar = await mountFixture({ value: "2020-01-01/2020-01-01", onchange: spy });
			const month = getMonth(calendar);
			const nextMonth = getNextPageButton(calendar);

			await nextMonth.click();
			await nextMonth.click();
			await nextMonth.click();

			await clickDay(month, "22 April");
			await clickDay(month, "19 April");

			expect(spy.count).toBe(1);
			expect(spy.last[0].target.value).toBe("2020-04-19/2020-04-22");
		});
	});

	describe("keyboard interaction", () => {
		it("can select a range: start -> end", async () => {
			const spy = createSpy();
			await mountFixture({ value: "2020-01-01/2020-01-01", onchange: spy });

			await userEvent.keyboard("{Tab}");
			await userEvent.keyboard("{Tab}");
			await userEvent.keyboard("{Enter}");
			await userEvent.keyboard("{Enter}");
			await userEvent.keyboard("{Enter}");
			await userEvent.keyboard("{Tab}");
			await userEvent.keyboard("{ArrowDown}");
			await userEvent.keyboard("{ArrowDown}");
			await userEvent.keyboard("{ArrowRight}");
			await userEvent.keyboard("{ArrowRight}");
			await userEvent.keyboard("{ArrowRight}");
			await userEvent.keyboard("{ArrowRight}");
			await userEvent.keyboard("{Enter}");
			await userEvent.keyboard("{ArrowRight}");
			await userEvent.keyboard("{ArrowRight}");
			await userEvent.keyboard("{ArrowRight}");
			await userEvent.keyboard("{Enter}");

			expect(spy.count).toBe(1);
			expect(spy.last[0].target.value).toBe("2020-04-19/2020-04-22");
		});

		it("can select a range: end -> start", async () => {
			const spy = createSpy();
			await mountFixture({ value: "2020-01-01/2020-01-01", onchange: spy });

			await userEvent.keyboard("{Tab}");
			await userEvent.keyboard("{Tab}");
			await userEvent.keyboard("{Enter}");
			await userEvent.keyboard("{Enter}");
			await userEvent.keyboard("{Enter}");
			await userEvent.keyboard("{Tab}");
			await userEvent.keyboard("{ArrowDown}");
			await userEvent.keyboard("{ArrowDown}");
			await userEvent.keyboard("{ArrowDown}");
			await userEvent.keyboard("{Enter}");
			await userEvent.keyboard("{ArrowLeft}");
			await userEvent.keyboard("{ArrowLeft}");
			await userEvent.keyboard("{ArrowLeft}");
			await userEvent.keyboard("{Enter}");

			expect(spy.count).toBe(1);
			expect(spy.last[0].target.value).toBe("2020-04-19/2020-04-22");
		});
	});

	describe("events", () => {
		it("raises a focusday event", async () => {
			const spy = createSpy<(e: CustomEvent<Date>) => void>();
			const calendar = await mountFixture({ value: "2022-01-01/2022-01-01", onfocusday: spy });

			await getNextPageButton(calendar).click();

			expect(spy.count).toBe(1);
			expect(spy.last[0].detail).toEqual(new Date("2022-02-01"));
		});

		it("raises a change event", async () => {
			const spy = createSpy<(e: Event) => void>();
			const calendar = await mountFixture({ value: "2022-01-01/2022-01-01", onchange: spy });

			const month = getMonth(calendar);
			await getPrevPageButton(calendar).click();

			await clickDay(month, "31 December");
			await clickDay(month, "30 December");

			expect(spy.count).toBe(1);
			const target = spy.last[0].target as InstanceType<typeof CalendarRange>;
			expect(target.value).toBe("2021-12-30/2021-12-31");
		});

		it("raises rangestart and rangeend events", async () => {
			const startSpy = createSpy<(e: CustomEvent<Date>) => void>();
			const endSpy = createSpy<(e: CustomEvent<Date>) => void>();

			const calendar = await mountFixture({
				value: "2022-01-01/2022-01-01",
				onrangestart: startSpy,
				onrangeend: endSpy
			});

			const month = getMonth(calendar);
			await getPrevPageButton(calendar).click();

			await clickDay(month, "31 December");
			expect(startSpy.count).toBe(1);
			expect(startSpy.last[0].detail).toEqual(new Date("2021-12-31"));
			expect(endSpy.called).toBe(false);

			await clickDay(month, "30 December");
			expect(startSpy.count).toBe(1);
			expect(endSpy.count).toBe(1);
			expect(endSpy.last[0].detail).toEqual(new Date("2021-12-30"));
		});
	});

	describe("focused date", () => {
		it("defaults to the first date in the range if not set", async () => {
			const calendar = await mountFixture({ value: "2020-01-05/2020-01-10" });
			const month = getMonth(calendar);

			const day = getDayButton(month, "5 January");
			await expect.element(page.elementLocator(day)).toHaveAttribute("tabindex", "0");
		});
	});

	describe("tentative date", () => {
		it("can be set", async () => {
			const calendar = await mountFixture({ "focused-date": "2024-04-01", tentative: "2024-04-19" });
			const month = getMonth(calendar);

			const day = getDayButton(month, "19 April");
			expect(day).toHavePart("selected");
			expect(day).toHavePart("range-start");
			expect(day).toHavePart("range-end");
		});

		it("can be cleared", async () => {
			const calendar = await mountFixture({ "focused-date": "2024-04-01" });
			const month = getMonth(calendar);

			await clickDay(month, "19 April");
			expect(calendar.tentative).toBe("2024-04-19");
			await userEvent.keyboard("{ArrowRight}");

			const before = getSelectedDays(month);
			expect(before[0]!).toHavePart("selected");
			expect(before[0]!).toHavePart("range-start");
			expect(before[1]!).toHavePart("selected");
			expect(before[1]!).toHavePart("range-end");

			calendar.tentative = "";
			await calendar.updateComplete;

			const after = getSelectedDays(month);
			expect(after.length).toBe(0);
		});
	});

	describe("grid", () => {
		it("allows arbitrary DOM structure", async () => {
			const inner = createElement("calendar-month");
			const wrapper = document.createElement("div");
			const wrapper2 = document.createElement("div");
			const wrapper3 = document.createElement("div");
			wrapper3.appendChild(inner);
			wrapper2.appendChild(wrapper3);
			wrapper.appendChild(wrapper2);

			const calendar = await mountFixture({ value: "2020-01-05/2020-01-07" }, [wrapper]);

			const month = getMonth(calendar);
			const fifth = getDayButton(month, "5 January");
			const sixth = getDayButton(month, "6 January");
			const seventh = getDayButton(month, "7 January");

			await expect.element(getMonthHeading(month)).toHaveTextContent("January");
			await expect.element(page.elementLocator(fifth)).toHaveAttribute("aria-pressed", "true");
			await expect.element(page.elementLocator(sixth)).toHaveAttribute("aria-pressed", "true");
			await expect.element(page.elementLocator(seventh)).toHaveAttribute("aria-pressed", "true");
		});
	});
});

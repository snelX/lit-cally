import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { CalendarDate } from "../calendar-date/calendar-date.js";
import { CalendarMonth } from "../calendar-month/calendar-month.js";
import { CalendarSelectMonth } from "../calendar-year-month/calendar-select-month.js";
import { CalendarSelectYear } from "../calendar-year-month/calendar-select-year.js";
import { createElement, getCalendarHeading, getNextPageButton, mount, type CalendarInstance } from "../utils/test.js";

async function mountFixture(props: Record<string, any> = {}) {
	const children = [
		createElement("calendar-select-month", props.formatMonth ? { "format-month": props.formatMonth } : {}),
		createElement("calendar-select-year", props.maxYears ? { "max-years": props.maxYears } : {}),
		createElement("calendar-month")
	];

	const { formatMonth, maxYears, ...rest } = props;

	return mount<CalendarDate>("calendar-date", { ...rest }, children);
}

function getMonthSelect(calendar: CalendarInstance): HTMLSelectElement {
	return calendar.querySelector("calendar-select-month")!.shadowRoot!.querySelector("select")!;
}

function getYearSelect(calendar: CalendarInstance): HTMLSelectElement {
	return calendar.querySelector("calendar-select-year")!.shadowRoot!.querySelector("select")!;
}

afterEach(() => {
	document.querySelectorAll("calendar-date").forEach((el) => el.remove());
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
describe("CalendarSelectMonth / CalendarSelectYear", () => {
	it("registers and upgrades custom elements in browser runtime", async () => {
		expect(customElements.get("calendar-date")).toBe(CalendarDate);
		expect(customElements.get("calendar-month")).toBe(CalendarMonth);
		expect(customElements.get("calendar-select-month")).toBe(CalendarSelectMonth);
		expect(customElements.get("calendar-select-year")).toBe(CalendarSelectYear);

		const calendar = await mountFixture({ value: "2025-12-15" });
		expect(calendar).toBeInstanceOf(CalendarDate);
		expect(calendar.querySelector("calendar-month")).toBeInstanceOf(CalendarMonth);
		expect(calendar.querySelector("calendar-select-month")).toBeInstanceOf(CalendarSelectMonth);
		expect(calendar.querySelector("calendar-select-year")).toBeInstanceOf(CalendarSelectYear);
	});

	it("updates as the calendar changes", async () => {
		const calendar = await mountFixture({ value: "2025-12-15" });
		await sleep(1000);
		console.log("---calendar.value", calendar.value);
		const monthSelect = getMonthSelect(calendar);
		const yearSelect = getYearSelect(calendar);

		expect(monthSelect.value).toBe("12");
		expect(yearSelect.value).toBe("2025");

		const nextPage = getNextPageButton(calendar);
		await nextPage.click();

		expect(monthSelect.value).toBe("1");
		expect(yearSelect.value).toBe("2026");
	});

	it("can change the month", async () => {
		const calendar = await mountFixture({ value: "2025-12-15" });
		const monthSelect = getMonthSelect(calendar);

		expect(monthSelect.value).toBe("12");
		await expect.element(getCalendarHeading(calendar)).toHaveTextContent("December 2025");

		await userEvent.selectOptions(monthSelect, "11");

		expect(monthSelect.value).toBe("11");
		await expect.element(getCalendarHeading(calendar)).toHaveTextContent("November 2025");
	});

	it("can change the year", async () => {
		const calendar = await mountFixture({ value: "2025-12-15" });
		const yearSelect = getYearSelect(calendar);

		expect(yearSelect.value).toBe("2025");
		await expect.element(getCalendarHeading(calendar)).toHaveTextContent("December 2025");

		await userEvent.selectOptions(yearSelect, "2026");

		expect(yearSelect.value).toBe("2026");
		await expect.element(getCalendarHeading(calendar)).toHaveTextContent("December 2026");
	});

	it("handles min and max dates", async () => {
		const calendar = await mountFixture({ value: "2025-06-01", min: "2024-06-01", max: "2026-02-01" });

		const monthSelect = getMonthSelect(calendar);
		const yearSelect = getYearSelect(calendar);

		expect(Array.from(yearSelect.options).map((o) => o.label)).toEqual(["2024", "2025", "2026"]);

		expect(Array.from(monthSelect.options).map((o) => ({ label: o.label, disabled: o.disabled }))).toEqual([
			{ label: "January", disabled: false },
			{ label: "February", disabled: false },
			{ label: "March", disabled: false },
			{ label: "April", disabled: false },
			{ label: "May", disabled: false },
			{ label: "June", disabled: false },
			{ label: "July", disabled: false },
			{ label: "August", disabled: false },
			{ label: "September", disabled: false },
			{ label: "October", disabled: false },
			{ label: "November", disabled: false },
			{ label: "December", disabled: false }
		]);

		await userEvent.selectOptions(yearSelect, "2024");

		expect(Array.from(monthSelect.options).map((o) => ({ label: o.label, disabled: o.disabled }))).toEqual([
			{ label: "January", disabled: true },
			{ label: "February", disabled: true },
			{ label: "March", disabled: true },
			{ label: "April", disabled: true },
			{ label: "May", disabled: true },
			{ label: "June", disabled: false },
			{ label: "July", disabled: false },
			{ label: "August", disabled: false },
			{ label: "September", disabled: false },
			{ label: "October", disabled: false },
			{ label: "November", disabled: false },
			{ label: "December", disabled: false }
		]);
	});

	it("does not disable months with valid days when min is not first of month", async () => {
		const calendar = await mountFixture({ value: "2026-01-15", min: "2026-01-02", max: "2026-03-15" });

		const monthSelect = getMonthSelect(calendar);

		expect(Array.from(monthSelect.options).map((o) => ({ label: o.label, disabled: o.disabled }))).toEqual([
			{ label: "January", disabled: false },
			{ label: "February", disabled: false },
			{ label: "March", disabled: false },
			{ label: "April", disabled: true },
			{ label: "May", disabled: true },
			{ label: "June", disabled: true },
			{ label: "July", disabled: true },
			{ label: "August", disabled: true },
			{ label: "September", disabled: true },
			{ label: "October", disabled: true },
			{ label: "November", disabled: true },
			{ label: "December", disabled: true }
		]);
	});

	it("can render month names in long format", async () => {
		const calendar = await mountFixture({ value: "2025-12-15", formatMonth: "long" });

		const monthSelect = getMonthSelect(calendar);
		expect(Array.from(monthSelect.options).map((o) => o.label)).toEqual([
			"January",
			"February",
			"March",
			"April",
			"May",
			"June",
			"July",
			"August",
			"September",
			"October",
			"November",
			"December"
		]);
	});

	it("can render month names in short format", async () => {
		const calendar = await mountFixture({ value: "2025-12-15", formatMonth: "short" });

		const monthSelect = getMonthSelect(calendar);
		expect(Array.from(monthSelect.options).map((o) => o.label)).toEqual(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"]);
	});

	it("respects maxYears prop", async () => {
		const calendar = await mountFixture({ value: "2025-12-15", maxYears: 6 });

		const yearSelect = getYearSelect(calendar);
		expect(Array.from(yearSelect.options).map((o) => o.label)).toEqual(["2022", "2023", "2024", "2025", "2026", "2027"]);
	});

	it("centers years around current year when no min/max", async () => {
		const calendar = await mountFixture({ value: "2025-12-15", maxYears: 10 });

		const yearSelect = getYearSelect(calendar);
		expect(Array.from(yearSelect.options).map((o) => o.label)).toEqual(["2020", "2021", "2022", "2023", "2024", "2025", "2026", "2027", "2028", "2029"]);
	});

	it("respects min/max range when smaller than maxYears", async () => {
		const calendar = await mountFixture({
			value: "2025-06-01",
			min: "2024-01-01",
			max: "2026-12-31",
			maxYears: 20
		});

		const yearSelect = getYearSelect(calendar);
		expect(Array.from(yearSelect.options).map((o) => o.label)).toEqual(["2024", "2025", "2026"]);
	});

	it("constrains centered range when min is set", async () => {
		const calendar = await mountFixture({ value: "2025-01-01", min: "2023-01-01", maxYears: 10 });

		const yearSelect = getYearSelect(calendar);
		expect(Array.from(yearSelect.options).map((o) => o.label)).toEqual(["2023", "2024", "2025", "2026", "2027", "2028", "2029"]);
	});

	it("constrains centered range when max is set", async () => {
		const calendar = await mountFixture({ value: "2025-12-31", max: "2027-12-31", maxYears: 10 });

		const yearSelect = getYearSelect(calendar);
		expect(Array.from(yearSelect.options).map((o) => o.label)).toEqual(["2020", "2021", "2022", "2023", "2024", "2025", "2026", "2027"]);
	});
});

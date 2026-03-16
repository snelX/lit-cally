import { describe, it, expect, afterEach } from "vitest";
import { userEvent, page } from "vitest/browser";
import {
  clickDay,
  createSpy,
  getDayButton,
  getMonth,
  getMonthHeading,
  getNextPageButton,
  getPrevPageButton,
  mount,
  createElement,
} from "../utils/test.js";

import "../calendar-month/calendar-month.js";
import { CalendarMulti } from "./calendar-multi.js";

async function mountFixture(props: Record<string, any> = {}, children?: HTMLElement[]) {
  const defaultChildren = children ?? [createElement("calendar-month")];
  return mount<CalendarMulti>("calendar-multi", { locale: "en-GB", ...props }, defaultChildren);
}

afterEach(() => {
  document.querySelectorAll("calendar-multi").forEach((el) => el.remove());
});

describe("CalendarMulti", () => {
  it("is defined", async () => {
    const calendar = await mountFixture();
    expect(calendar).toBeInstanceOf(CalendarMulti);
  });

  describe("mouse interaction", () => {
    it("can select a multiple days", async () => {
      const spy = createSpy<(e: Event) => void>();
      const calendar = await mountFixture({ value: "2020-01-01 2020-01-03", onchange: spy });

      const month = getMonth(calendar);
      const nextMonth = getNextPageButton(calendar);

      await nextMonth.click();
      await nextMonth.click();
      await nextMonth.click();

      await clickDay(month, "19 April");
      expect(spy.count).toBe(1);
      expect(calendar.value).toBe("2020-01-01 2020-01-03 2020-04-19");

      await clickDay(month, "22 April");
      expect(spy.count).toBe(2);
      expect(calendar.value).toBe("2020-01-01 2020-01-03 2020-04-19 2020-04-22");

      await clickDay(month, "22 April");
      expect(spy.count).toBe(3);
      expect(calendar.value).toBe("2020-01-01 2020-01-03 2020-04-19");
    });
  });

  describe("keyboard interaction", () => {
    it("can select multiple days", async () => {
      const spy = createSpy();
      await mountFixture({ value: "2020-01-01 2020-01-03", onchange: spy });

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

      expect(spy.count).toBe(1);
      expect(spy.last[0].target.value).toBe("2020-01-01 2020-01-03 2020-04-19");

      await userEvent.keyboard("{ArrowRight}");
      await userEvent.keyboard("{ArrowRight}");
      await userEvent.keyboard("{ArrowRight}");
      await userEvent.keyboard("{Enter}");

      expect(spy.count).toBe(2);
      expect(spy.last[0].target.value).toBe("2020-01-01 2020-01-03 2020-04-19 2020-04-22");

      await userEvent.keyboard("{Enter}");
      expect(spy.count).toBe(3);
      expect(spy.last[0].target.value).toBe("2020-01-01 2020-01-03 2020-04-19");
    });
  });

  describe("events", () => {
    it("raises a change event", async () => {
      const spy = createSpy<(e: Event) => void>();
      const calendar = await mountFixture({ value: "2022-01-01 2022-01-03", onchange: spy });

      const month = getMonth(calendar);
      await getPrevPageButton(calendar).click();

      await clickDay(month, "31 December");
      expect(spy.count).toBe(1);
      expect(calendar.value).toBe("2022-01-01 2022-01-03 2021-12-31");

      await clickDay(month, "30 December");
      expect(spy.count).toBe(2);
      expect(calendar.value).toBe("2022-01-01 2022-01-03 2021-12-31 2021-12-30");
    });
  });

  describe("focused date", () => {
    it("defaults to the first date in the list if not set", async () => {
      const calendar = await mountFixture({ value: "2020-01-05 2020-01-10" });
      const month = getMonth(calendar);

      const day = getDayButton(month, "5 January");
      await expect.element(page.elementLocator(day)).toHaveAttribute("tabindex", "0");
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

      const calendar = await mountFixture({ value: "2020-01-05 2020-01-10" }, [wrapper]);

      const month = getMonth(calendar);
      const fifth = getDayButton(month, "5 January");
      const tenth = getDayButton(month, "10 January");

      await expect.element(getMonthHeading(month)).toHaveTextContent("January");
      await expect.element(page.elementLocator(fifth)).toHaveAttribute("aria-pressed", "true");
      await expect.element(page.elementLocator(tenth)).toHaveAttribute("aria-pressed", "true");
    });
  });
});

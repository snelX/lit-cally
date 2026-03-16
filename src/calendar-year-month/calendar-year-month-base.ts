import { html, type TemplateResult } from "lit";
import { reset, vh } from "../utils/styles.js";

export type MonthOption = {
  label: string;
  value: string;
  disabled: boolean;
  selected: boolean;
};
export type YearOption = {
  label: string;
  value: string;
  selected: boolean;
};

export function renderSelectBase(props: {
  options: MonthOption[] | YearOption[];
  onChange: (e: Event) => void;
  label: string;
}): TemplateResult {
  return html`
    <label part="label" for="s">
      <slot name="label">${props.label}</slot>
    </label>
    <select id="s" part="select" @change=${props.onChange}>
      ${props.options.map(
        (option) => html`
          <option
            part="option"
            .value=${option.value}
            .selected=${option.selected}
            ?disabled=${"disabled" in option ? (option as MonthOption).disabled : false}
          >
            ${option.label}
          </option>
        `
      )}
    </select>
  `;
}

export const selectBaseStyles = [reset, vh];

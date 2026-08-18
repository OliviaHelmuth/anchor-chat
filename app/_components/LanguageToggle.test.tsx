import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageToggle } from "./LanguageToggle";
import { I18nProvider } from "@/lib/i18n";

describe("LanguageToggle", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("defaults to German pressed (this app's default locale)", () => {
    render(
      <I18nProvider>
        <LanguageToggle />
      </I18nProvider>,
    );
    expect(screen.getByRole("button", { name: "DE" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "EN" })).toHaveAttribute("aria-pressed", "false");
  });

  it("switches locale and persists the choice to localStorage", async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider>
        <LanguageToggle />
      </I18nProvider>,
    );

    await user.click(screen.getByRole("button", { name: "EN" }));

    expect(screen.getByRole("button", { name: "EN" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "DE" })).toHaveAttribute("aria-pressed", "false");
    expect(window.localStorage.getItem("anchor_locale")).toBe("en");
  });
});

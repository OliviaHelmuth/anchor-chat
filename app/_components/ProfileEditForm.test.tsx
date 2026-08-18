import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileEditForm } from "./ProfileEditForm";
import { I18nProvider } from "@/lib/i18n";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

function renderForm() {
  return render(
    <I18nProvider>
      <ProfileEditForm initialDisplayName="Menty B" initialBio="Here to listen." />
    </I18nProvider>,
  );
}

describe("ProfileEditForm", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.localStorage.setItem("anchor_locale", "en");
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("pre-fills the current display name and bio", () => {
    renderForm();
    expect(screen.getByLabelText("Display name")).toHaveValue("Menty B");
    expect(screen.getByLabelText("Bio")).toHaveValue("Here to listen.");
  });

  it("saves the edited profile", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const user = userEvent.setup();
    renderForm();

    await user.clear(screen.getByLabelText("Display name"));
    await user.type(screen.getByLabelText("Display name"), "Robin");
    await user.click(screen.getByRole("button", { name: "Save profile" }));

    await waitFor(() => {
      expect(screen.getByText("Saved.")).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/listeners/me",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ displayName: "Robin", bio: "Here to listen." }),
      }),
    );
  });

  it("shows an error when the save fails", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "Bio is too long" }), { status: 400 }),
    );
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Save profile" }));

    await waitFor(() => {
      expect(screen.getByText("Bio is too long")).toBeInTheDocument();
    });
  });
});

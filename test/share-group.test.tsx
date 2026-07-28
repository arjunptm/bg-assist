import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import QRCode from "qrcode";
import { ShareGroup } from "../src/components/ShareGroup";

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn() }
}));

const capability = "a".repeat(43);

function useNavigator(overrides: { share?: (data: ShareData) => Promise<void>; writeText?: (text: string) => Promise<void> }) {
  vi.stubGlobal("navigator", {
    share: overrides.share,
    clipboard: overrides.writeText ? { writeText: overrides.writeText } : undefined
  });
}

beforeEach(() => {
  window.history.replaceState({}, "", `/g/${capability}`);
  vi.mocked(QRCode.toDataURL).mockImplementation(async () => "data:image/png;base64,qr");
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("group sharing fallbacks", () => {
  it("opens a selectable manual-link and QR fallback when native sharing is unavailable", async () => {
    const writeText = vi.fn(async () => undefined);
    useNavigator({ writeText });
    render(<ShareGroup name="Friday Game Night" />);

    fireEvent.click(screen.getByRole("button", { name: "Share group" }));

    expect(screen.getByRole("dialog", { name: "Join Friday Game Night" })).toBeTruthy();
    const link = screen.getByLabelText("Group link") as HTMLInputElement;
    expect(link.value).toBe(window.location.href);
    expect(link.readOnly).toBe(true);
    expect(screen.getByRole("status").textContent).toContain("Choose a sharing option below");
    expect(await screen.findByRole("img", { name: "QR code for Friday Game Night" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Copy group link" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(window.location.href));
    expect(screen.getByRole("status").textContent).toContain("Group link copied");
  });

  it("falls back visibly when native sharing and clipboard copying fail", async () => {
    const share = vi.fn(async () => { throw new Error("Share unavailable"); });
    const writeText = vi.fn(async () => { throw new Error("Clipboard unavailable"); });
    useNavigator({ share, writeText });
    render(<ShareGroup name="Friday Game Night" />);

    fireEvent.click(screen.getByRole("button", { name: "Share group" }));
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Native sharing was unavailable");

    fireEvent.click(screen.getByRole("button", { name: "Copy group link" }));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(screen.getByRole("status").textContent).toContain("Copy the selected link manually");
    expect(document.activeElement).toBe(screen.getByLabelText("Group link"));
  });

  it("treats native share cancellation as intentional", async () => {
    const share = vi.fn(async () => { throw { name: "AbortError" }; });
    useNavigator({ share });
    render(<ShareGroup name="Friday Game Night" />);

    fireEvent.click(screen.getByRole("button", { name: "Share group" }));
    await waitFor(() => expect(share).toHaveBeenCalled());

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps the manual link usable when QR generation fails", async () => {
    vi.mocked(QRCode.toDataURL).mockRejectedValueOnce(new Error("QR unavailable"));
    useNavigator({});
    render(<ShareGroup name="Friday Game Night" />);

    fireEvent.click(screen.getByRole("button", { name: "Show group QR code" }));

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "The QR code could not be created. You can still share the link below."
    );
    expect((screen.getByLabelText("Group link") as HTMLInputElement).value).toBe(window.location.href);
  });

  it("closes the fallback with Escape without attempting clipboard access", async () => {
    const writeText = vi.fn(async () => undefined);
    useNavigator({ writeText });
    render(<ShareGroup name="Friday Game Night" />);
    fireEvent.click(screen.getByRole("button", { name: "Show group QR code" }));
    expect(screen.getByRole("dialog")).toBeTruthy();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(writeText).not.toHaveBeenCalled();
  });
});

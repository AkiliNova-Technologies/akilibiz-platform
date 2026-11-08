import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

afterEach(() => {
  toast.dismiss();
  cleanup();
});

describe("Toaster", () => {
  it("uses the same neutral surface for default and semantic toast variants", async () => {
    render(<Toaster visibleToasts={4} duration={Infinity} />);

    toast("Neutral message", { testId: "neutral-toast" });
    toast.success("Saved", { testId: "success-toast" });
    toast.warning("Review this", { testId: "warning-toast" });
    toast.error("Could not save", { testId: "error-toast" });

    const toasts = await Promise.all([
      screen.findByTestId("neutral-toast"),
      screen.findByTestId("success-toast"),
      screen.findByTestId("warning-toast"),
      screen.findByTestId("error-toast"),
    ]);

    for (const toastElement of toasts) {
      expect(toastElement).toHaveAttribute("data-rich-colors", "false");
      expect(toastElement).toHaveStyle({
        "--normal-bg": "var(--popover)",
        "--normal-border": "var(--border)",
        "--normal-text": "var(--popover-foreground)",
        "--border-radius": "var(--radius)",
      });
    }

    expect(screen.getByTestId("success-toast").querySelector("svg")).toHaveClass("text-emerald-600");
    expect(screen.getByTestId("warning-toast").querySelector("svg")).toHaveClass("text-amber-600");
    expect(screen.getByTestId("error-toast").querySelector("svg")).toHaveClass("text-destructive");
  });

  it("keeps the close control accessible and dismissible", async () => {
    const onDismiss = vi.fn();
    render(<Toaster closeButton duration={Infinity} />);

    toast.success("Saved", { testId: "dismissible-toast", onDismiss });

    fireEvent.click(await screen.findByRole("button", { name: "Close toast" }));

    await waitFor(() => {
      expect(onDismiss).toHaveBeenCalledOnce();
    });
  });
});

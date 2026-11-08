import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FieldLabel } from "@/components/ui/field";

describe("FieldLabel", () => {
  it("visibly and programmatically identifies required fields", () => {
    render(<FieldLabel required htmlFor="business-name">Business name</FieldLabel>);

    expect(screen.getByText("*")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("(required)")).toHaveClass("sr-only");
  });

  it("does not add a required marker for optional fields", () => {
    render(<FieldLabel>Notes</FieldLabel>);

    expect(screen.queryByText("*")).not.toBeInTheDocument();
    expect(screen.queryByText(/required/i)).not.toBeInTheDocument();
  });
});

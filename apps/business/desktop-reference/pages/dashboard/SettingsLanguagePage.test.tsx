import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { describe, expect, it, vi } from "vitest";
import localeReducer from "@/redux/slices/localeSlice";
import SettingsLanguagePage from "@/app/dashboard/SettingsLanguagePage";

vi.mock("@/components/site-header", () => ({
  SiteHeader: ({ label }: { label: string }) => <h1>{label}</h1>,
}));

describe("Settings language control", () => {
  it("renders the persisted English language option", () => {
    const store = configureStore({ reducer: { locale: localeReducer } });
    render(<Provider store={store}><SettingsLanguagePage /></Provider>);
    expect(screen.getAllByText("Language").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Display language")).toBeInTheDocument();
    expect(screen.getByText("English is the only production language currently available.")).toBeInTheDocument();
  });
});

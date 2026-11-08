import { render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ModuleGuard } from "@/components/module-guard";
import localeReducer from "@/redux/slices/localeSlice";

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: () => true, loadingAuth: true }),
}));

describe("ModuleGuard", () => {
  it("renders the centralized loading state while permissions are loading", () => {
    const store = configureStore({ reducer: { locale: localeReducer } });

    render(
      <Provider store={store}>
        <MemoryRouter>
          <ModuleGuard permission="settings.manage">Protected content</ModuleGuard>
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });
});

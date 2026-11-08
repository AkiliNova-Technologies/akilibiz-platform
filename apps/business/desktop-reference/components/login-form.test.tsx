import { render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/components/login-form";
import localeReducer from "@/redux/slices/localeSlice";

vi.mock("@/hooks/useReduxAuth", () => ({
  useReduxAuth: () => ({ signIn: vi.fn(), loading: false }),
}));

describe("LoginForm", () => {
  it("renders the centralized English authentication labels", () => {
    const store = configureStore({ reducer: { locale: localeReducer } });

    render(
      <Provider store={store}>
        <MemoryRouter>
          <LoginForm />
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toHaveAttribute("placeholder", "Enter your username");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });
});

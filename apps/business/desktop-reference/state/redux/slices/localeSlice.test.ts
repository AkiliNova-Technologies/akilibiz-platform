import { describe, expect, it } from "vitest";
import localeReducer, { setLocale } from "@/redux/slices/localeSlice";

describe("locale preference", () => {
  it("defaults and rehydrates to en-UG", () => {
    expect(localeReducer(undefined, { type: "unknown" }).locale).toBe("en-UG");
    expect(localeReducer({ locale: "en-UG" }, { type: "persist/REHYDRATE", payload: { locale: "en-UG" } }).locale).toBe("en-UG");
  });

  it("accepts language-switch state", () => {
    expect(localeReducer(undefined, setLocale("en-UG")).locale).toBe("en-UG");
  });
});

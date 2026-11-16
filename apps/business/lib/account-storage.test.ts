import { describe, expect, it, vi } from "vitest";
import { clearAccountOperationStorage } from "./account-storage";

describe("account operation storage cleanup", () => {
  it("removes transaction recovery state but preserves user preferences", () => {
    const keys = [
      "akilibiz.cash-pilot.business-a",
      "akilibiz.product-request.draft-a",
      "akilibiz.purchase-request.draft-a",
      "akilibiz-theme",
      "unrelated",
    ];
    const removeItem = vi.fn((key: string) => {
      const index = keys.indexOf(key);
      if (index >= 0) keys.splice(index, 1);
    });
    clearAccountOperationStorage({
      get length() {
        return keys.length;
      },
      key: (index) => keys[index] ?? null,
      removeItem,
    });
    expect(removeItem).toHaveBeenCalledTimes(3);
    expect(keys).toEqual(["akilibiz-theme", "unrelated"]);
  });
});

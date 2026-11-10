import { StrictMode, useEffect, type ReactElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePosData, type PosProduct } from "./pos-data";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const product: PosProduct = {
  id: "product-a",
  name: "Coffee",
  sku: "COF-1",
  selling_price: 5_000,
  stock_quantity: 4,
  stock_unit: "kg",
  inventory_available: true,
  is_active: true,
  is_taxable: false,
  tax_classification_id: null,
  tax_inclusive: false,
  category_id: "category-a",
};

function response(businessId: string) {
  return {
    ok: true,
    json: async () => ({
      business_id: businessId,
      products: [product],
      categories: [{ id: "category-a", name: "Drinks" }],
    }),
  } as Response;
}

type PosData = ReturnType<typeof usePosData>;
let current: PosData;
const capture = (data: PosData) => { current = data; };

function Harness({
  businessId,
  search = "",
  onData,
}: {
  businessId: string;
  search?: string;
  onData: (data: PosData) => void;
}) {
  const data = usePosData(businessId);
  const { loadCatalogue, getCustomers, getTaxSettings, getTaxClassifications } = data;
  useEffect(() => {
    void Promise.all([
      loadCatalogue(),
      getCustomers(),
      getTaxSettings(),
      getTaxClassifications(),
    ]);
  }, [loadCatalogue, getCustomers, getTaxSettings, getTaxClassifications]);
  useEffect(() => onData(data), [data, onData]);
  // Model search/category state as ordinary render inputs. They must not enter
  // the catalogue-loading dependency graph.
  return <span>{search}:{data.cartItems.length}</span>;
}

async function renderHarness(
  businessId = "business-a",
  wrapper: (child: ReactElement) => ReactElement = (child) => child,
) {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(wrapper(<Harness businessId={businessId} onData={capture} />));
  });
  return renderer;
}

async function unmount(renderer: ReactTestRenderer) {
  await act(async () => renderer.unmount());
}

describe("POS catalogue request lifecycle", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response("business-a")));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads once on a normal initial mount and not on ordinary rerenders", async () => {
    const renderer = await renderHarness();
    expect(fetch).toHaveBeenCalledTimes(1);
    await act(async () => renderer.update(<Harness businessId="business-a" onData={capture} />));
    expect(fetch).toHaveBeenCalledTimes(1);
    await unmount(renderer);
  });

  it("does not reload for cart quantity updates", async () => {
    const renderer = await renderHarness();
    await act(async () => {
      current.addToReduxCart({
        product_id: product.id,
        name: product.name,
        price: product.selling_price!,
        quantity: 1,
        sku: product.sku,
        stock_unit: product.stock_unit,
      });
      current.updateItemQuantity(product.id, 2);
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    await unmount(renderer);
  });

  it("does not reload for search or category-style render changes", async () => {
    const renderer = await renderHarness();
    await act(async () => renderer.update(
      <Harness businessId="business-a" search="coffee:Drinks" onData={capture} />,
    ));
    expect(fetch).toHaveBeenCalledTimes(1);
    await unmount(renderer);
  });

  it("performs one new shared request for an explicit refresh", async () => {
    const renderer = await renderHarness();
    await act(async () => current.loadCatalogue());
    expect(fetch).toHaveBeenCalledTimes(2);
    await unmount(renderer);
  });

  it("reloads for a new business and applies only that business response", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(response("business-a"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          business_id: "business-b",
          products: [{ ...product, id: "product-b", name: "Tea" }],
          categories: [],
        }),
      } as Response);
    const renderer = await renderHarness();
    await act(async () => renderer.update(<Harness businessId="business-b" onData={capture} />));
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(current.products).toEqual([
      expect.objectContaining({ id: "product-b", name: "Tea" }),
    ]);
    await unmount(renderer);
  });

  it("does not let a late response from the previous business overwrite the new one", async () => {
    let resolveBusinessA!: (value: Response) => void;
    vi.mocked(fetch)
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveBusinessA = resolve;
      }))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          business_id: "business-b",
          products: [{ ...product, id: "product-b", name: "Tea" }],
          categories: [],
        }),
      } as Response);

    const renderer = await renderHarness();
    await act(async () => renderer.update(
      <Harness businessId="business-b" onData={capture} />,
    ));
    await act(async () => resolveBusinessA(response("business-a")));

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(current.products).toEqual([
      expect.objectContaining({ id: "product-b", name: "Tea" }),
    ]);
    await unmount(renderer);
  });

  it("shows an error after a network failure without retrying", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
    const renderer = await renderHarness();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(current.error).toContain("could not be loaded");
    await act(async () => renderer.update(<Harness businessId="business-a" onData={capture} />));
    expect(fetch).toHaveBeenCalledTimes(1);
    await unmount(renderer);
  });

  it("keeps Strict Mode replay bounded instead of starting a request loop", async () => {
    const renderer = await renderHarness(
      "business-a",
      (child) => <StrictMode>{child}</StrictMode>,
    );
    expect(fetch).toHaveBeenCalledTimes(2);
    await act(async () => renderer.update(
      <StrictMode><Harness businessId="business-a" onData={capture} /></StrictMode>,
    ));
    expect(fetch).toHaveBeenCalledTimes(2);
    await unmount(renderer);
  });
});

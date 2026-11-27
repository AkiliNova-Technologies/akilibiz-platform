"use client";

// Web stand-ins for the desktop's file save dialog and catalogue CSV export:
// the browser downloads the file instead of writing it to a chosen path.
export async function save(options: { title?: string; defaultPath?: string; filters?: Array<{ name: string; extensions: string[] }> }): Promise<string | null> {
  return options.defaultPath ?? "akilibiz-product-catalogue.csv";
}

export const importExportService = {
  async exportProductCatalogueCsv(fileName: string, _overwrite: boolean) {
    const response = await fetch("/api/catalogue/export?entity=products", { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? "Could not export the catalogue.");
    }
    const rowCount = Number(response.headers.get("X-Row-Count") ?? "0");
    const url = URL.createObjectURL(await response.blob());
    try {
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } finally {
      URL.revokeObjectURL(url);
    }
    return { file_name: fileName, row_count: Number.isFinite(rowCount) ? rowCount : 0 };
  },
};

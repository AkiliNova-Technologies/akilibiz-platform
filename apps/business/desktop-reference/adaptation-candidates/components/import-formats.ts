/** The visible import contract. Legacy parsers may retain read-only compatibility. */
export const IMPORT_FORMATS = {
  extensions: ["csv", "xlsx"],
  label: "CSV, XLSX",
  picker: [{ name: "CSV or Excel", extensions: ["csv", "xlsx"] }],
  dropzone: {
    "text/csv": [".csv"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  },
} as const;

export function importFormatFromPath(path: string): "CSV" | "XLSX" | null {
  const extension = path.split(".").pop()?.toLowerCase();
  if (extension === "csv") return "CSV";
  if (extension === "xlsx") return "XLSX";
  return null;
}

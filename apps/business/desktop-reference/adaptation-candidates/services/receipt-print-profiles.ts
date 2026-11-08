export const printProfileIds = ["thermal-58mm", "thermal-80mm", "document-a4"] as const;
export type PrintProfileId = (typeof printProfileIds)[number];
export type PrintProfile = { id: PrintProfileId; label: string; paper: string; margin: string; typography: string; logo: "compact" | "standard"; wrapping: "compact" | "document"; intendedUse: string };

export const printProfiles: Record<PrintProfileId, PrintProfile> = {
  "thermal-58mm": { id: "thermal-58mm", label: "Thermal 58 mm", paper: "58mm", margin: "2mm", typography: "8.5pt", logo: "compact", wrapping: "compact", intendedUse: "Narrow thermal rolls" },
  "thermal-80mm": { id: "thermal-80mm", label: "Thermal 80 mm", paper: "80mm", margin: "3mm", typography: "10pt", logo: "compact", wrapping: "compact", intendedUse: "Standard thermal rolls" },
  "document-a4": { id: "document-a4", label: "Document A4", paper: "A4", margin: "14mm", typography: "10pt", logo: "standard", wrapping: "document", intendedUse: "Full-page customer document" },
};

export const printProfileFor = (value?: string | null): PrintProfile => printProfiles[value as PrintProfileId] ?? printProfiles["thermal-80mm"];
export const profileFromLegacyWidth = (width?: string | null): PrintProfileId => width?.trim() === "58mm" ? "thermal-58mm" : "thermal-80mm";

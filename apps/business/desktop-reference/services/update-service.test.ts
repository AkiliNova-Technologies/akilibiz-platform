import { describe, expect, it } from "vitest";
import { formatUpdateBytes, initialUpdaterState, progressFromDownloadEvent, progressPercentage, publicUpdateError } from "@/services/update-service";

describe("updater progress", () => {
  it("accumulates download chunks and calculates a bounded percentage", () => {
    let progress = progressFromDownloadEvent(initialUpdaterState.progress, { event: "Started", data: { contentLength: 1000 } });
    progress = progressFromDownloadEvent(progress, { event: "Progress", data: { chunkLength: 250 } });
    progress = progressFromDownloadEvent(progress, { event: "Progress", data: { chunkLength: 800 } });
    expect(progress.downloadedBytes).toBe(1050);
    expect(progressPercentage(progress)).toBe(100);
  });

  it("uses an indeterminate progress state when the content length is unavailable", () => {
    const progress = progressFromDownloadEvent(initialUpdaterState.progress, { event: "Started", data: {} });
    expect(progressPercentage(progress)).toBeUndefined();
    expect(formatUpdateBytes(progress.contentLength)).toBe("—");
  });

  it("keeps verification failures visible without exposing implementation details", () => {
    expect(publicUpdateError(new Error("signature verification failed at https://private.example"))).toBe("The update could not be verified and was not installed.");
    expect(publicUpdateError(new Error("network failure at https://private.example"))).toBe("The update could not be completed. Please try again later.");
  });
});

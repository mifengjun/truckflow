import { it, expect } from "vitest";
import { detectFile } from "@/modules/business/files";
it("checks actual file signatures rather than filenames or declared MIME types", () => {
  expect(detectFile(new TextEncoder().encode("%PDF-1.4\n"))).toEqual({
    mime: "application/pdf",
    ext: "pdf",
  });
  expect(
    detectFile(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])),
  ).toMatchObject({ ext: "png" });
  expect(detectFile(new Uint8Array([255, 216, 255, 1]))).toMatchObject({
    ext: "jpg",
  });
  expect(() =>
    detectFile(new TextEncoder().encode("forged executable")),
  ).toThrow("仅接受");
});

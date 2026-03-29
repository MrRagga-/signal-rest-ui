import { describe, expect, it } from "vitest";
import { joinUrl, normalizeBaseUrl, splitCsv } from "@/lib/utils";

describe("utils", () => {
  it("normalizes bare hostnames to http urls", () => {
    expect(normalizeBaseUrl("192.168.1.10:8080")).toBe("http://192.168.1.10:8080");
  });

  it("joins base urls and paths safely", () => {
    expect(joinUrl("http://signal.test:8080/", "/v1/about")).toBe(
      "http://signal.test:8080/v1/about",
    );
  });

  it("splits csv fields while trimming blanks", () => {
    expect(splitCsv("a, b ,, c")).toEqual(["a", "b", "c"]);
  });
});

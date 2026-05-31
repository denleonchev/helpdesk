import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("returns a single class unchanged", () => {
    expect(cn("foo")).toBe("foo");
  });

  it("joins multiple classes", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("ignores falsy values", () => {
    expect(cn("foo", false, null, undefined, "bar")).toBe("foo bar");
  });

  it("resolves conditional classes", () => {
    expect(cn("foo", { bar: true, baz: false })).toBe("foo bar");
  });

  it("merges conflicting tailwind classes, last wins", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("merges conflicts from conditional classes", () => {
    expect(cn("p-2", { "p-4": true })).toBe("p-4");
  });

  it("returns empty string when no inputs", () => {
    expect(cn()).toBe("");
  });
});

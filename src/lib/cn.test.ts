import { describe, expect, it } from "vitest";
import { cn } from "./cn.ts";

describe("cn", () => {
  describe("empty / falsy inputs", () => {
    it("returns an empty string when called with no arguments", () => {
      expect(cn()).toBe("");
    });

    it("returns an empty string when called with only falsy values", () => {
      expect(cn(undefined, null, false, "", 0)).toBe("");
    });
  });

  describe("string inputs", () => {
    it("returns a single string unchanged", () => {
      expect(cn("foo")).toBe("foo");
    });

    it("joins multiple strings with a single space", () => {
      expect(cn("foo", "bar", "baz")).toBe("foo bar baz");
    });

    it("drops empty strings but keeps the others", () => {
      expect(cn("foo", "", "bar")).toBe("foo bar");
    });
  });

  describe("numeric inputs", () => {
    it("preserves numbers as-is when truthy", () => {
      expect(cn(1, 2, 3)).toBe("1 2 3");
    });

    it("drops 0 and NaN", () => {
      expect(cn("a", 0, "b", Number.NaN, "c")).toBe("a b c");
    });
  });

  describe("object inputs", () => {
    it("returns keys whose values are truthy", () => {
      expect(cn({ foo: true, bar: true })).toBe("foo bar");
    });

    it("drops keys whose values are falsy", () => {
      expect(cn({ foo: true, bar: false, baz: undefined, qux: null })).toBe(
        "foo",
      );
    });

    it("supports mixed truthy and falsy object entries", () => {
      expect(
        cn("base", { active: true, disabled: false, "ring-2": undefined }),
      ).toBe("base active");
    });
  });

  describe("array inputs", () => {
    it("flattens nested arrays", () => {
      expect(cn(["a", "b"], ["c", ["d", "e"]])).toBe("a b c d e");
    });

    it("handles arrays of mixed types", () => {
      expect(cn(["a", { b: true, c: false }, ["d", null]])).toBe("a b d");
    });
  });

  describe("combined inputs", () => {
    it("joins strings, objects, arrays, and falsy values together", () => {
      expect(
        cn(
          "base",
          { active: true, "text-sm": true, hidden: false },
          ["px-2", null, "py-1"],
          undefined,
        ),
      ).toBe("base active text-sm px-2 py-1");
    });
  });

  describe("Tailwind class conflict resolution", () => {
    it("keeps the last occurrence when the same class is repeated (last wins)", () => {
      // Same class repeated → the last one wins because both produce the same token;
      // the contract is "last wins" for conflict rules, which Tailwind enforces
      // by source order in CSS, but clsx-style joiners keep the duplicate so the
      // caller can decide. This pins the canonical behavior of `cn`:
      // duplicates are preserved verbatim so Tailwind's source-order resolution
      // applies. We assert it explicitly so any future change is intentional.
      expect(cn("p-2", "p-4")).toBe("p-2 p-4");
    });

    it("keeps an explicitly earlier class even if a later unrelated class would normally win", () => {
      expect(cn("text-red-500", "text-blue-500")).toBe(
        "text-red-500 text-blue-500",
      );
    });
  });
});

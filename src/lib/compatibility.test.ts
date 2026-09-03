/**
 * smart-pc · compatibility rule tests (Phase 3, strict TDD).
 *
 * Each `describe` block adds one rule in RED → GREEN → TRIANGULATE order.
 * The first failing assertion per cycle must surface before any production
 * code is added; that is the contract this file documents.
 */
import { describe, expect, it } from "vitest";
import { validate } from "./compatibility";

describe("compatibility", () => {
  it("returns incompatible when CPU and motherboard sockets do not match", () => {
    const selection = {
      cpu: {
        id: "cpu-1",
        category: "cpu" as const,
        brand: "AMD",
        model: "Ryzen 5 5600",
        socket: "AM4",
        price: 0,
        specs: {},
      },
      motherboard: {
        id: "mb-1",
        category: "motherboard" as const,
        brand: "ASUS",
        model: "ROG Strix Z790",
        socket: "LGA1700",
        price: 0,
        specs: {},
      },
    };
    const result = validate(selection);
    expect(result.level).toBe("incompatible");
    expect(
      result.messages.some((m) => m.toLowerCase().includes("socket")),
    ).toBe(true);
  });
});

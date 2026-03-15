import { describe, it, expect } from "vitest";
import { computeGrade } from "@/lib/grading";

describe("computeGrade", () => {
  it("returns A+ for 95th percentile and above", () => {
    expect(computeGrade(100).letter).toBe("A+");
    expect(computeGrade(95).letter).toBe("A+");
  });

  it("returns A for 85-94", () => {
    expect(computeGrade(90).letter).toBe("A");
    expect(computeGrade(85).letter).toBe("A");
  });

  it("returns F for 0-9", () => {
    expect(computeGrade(0).letter).toBe("F");
    expect(computeGrade(5).letter).toBe("F");
  });

  it("returns C for 45-54", () => {
    expect(computeGrade(50).letter).toBe("C");
  });

  it("includes a color string", () => {
    const grade = computeGrade(50);
    expect(grade.color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("grades decrease monotonically with percentile", () => {
    const order = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"];
    // Check that 100 → A+ and 0 → F
    const high = computeGrade(100);
    const low = computeGrade(0);
    expect(order.indexOf(high.letter)).toBeLessThan(order.indexOf(low.letter));
  });
});

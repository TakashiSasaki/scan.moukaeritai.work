import { describe, it, expect } from "vitest";
import { parseReconcileProjectionSummariesInput } from "../functions/src/projectionReconcileBatchInput";
import { ProjectionRecomputeInputError } from "../functions/src/projectionRecomputeInput";

describe("parseReconcileProjectionSummariesInput", () => {
  it("1. accepts one object target", () => {
    const input = {
      targets: [{ targetType: "object", targetId: "test-object" }]
    };
    const result = parseReconcileProjectionSummariesInput(input);
    expect(result.targets).toHaveLength(1);
    expect(result.targets[0].targetType).toBe("object");
    expect(result.targets[0].targetId).toBe("test-object");
  });

  it("2. accepts mixed object / marker / place targets", () => {
    const input = {
      targets: [
        { targetType: "object", targetId: "test-object" },
        { targetType: "marker", targetId: "test-marker" },
        { targetType: "place", targetId: "test-place" }
      ]
    };
    const result = parseReconcileProjectionSummariesInput(input);
    expect(result.targets).toHaveLength(3);
    expect(result.targets.map(t => t.targetType)).toEqual(["object", "marker", "place"]);
  });

  it("3. trims targetId", () => {
    const input = {
      targets: [{ targetType: "object", targetId: "  test-object  " }]
    };
    const result = parseReconcileProjectionSummariesInput(input);
    expect(result.targets[0].targetId).toBe("test-object");
  });

  it("4. rejects missing targets", () => {
    const input = {};
    expect(() => parseReconcileProjectionSummariesInput(input))
      .toThrow(ProjectionRecomputeInputError);
    expect(() => parseReconcileProjectionSummariesInput(input))
      .toThrow("targets must be an array");
  });

  it("5. rejects empty targets array", () => {
    const input = { targets: [] };
    expect(() => parseReconcileProjectionSummariesInput(input))
      .toThrow(ProjectionRecomputeInputError);
    expect(() => parseReconcileProjectionSummariesInput(input))
      .toThrow("targets array cannot be empty");
  });

  it("6. rejects invalid targetType", () => {
    const input = { targets: [{ targetType: "invalid", targetId: "test" }] };
    expect(() => parseReconcileProjectionSummariesInput(input))
      .toThrow(ProjectionRecomputeInputError);
  });

  it("7. rejects empty targetId", () => {
    const input = { targets: [{ targetType: "object", targetId: "   " }] };
    expect(() => parseReconcileProjectionSummariesInput(input))
      .toThrow(ProjectionRecomputeInputError);
  });

  it("8. rejects targetId containing /", () => {
    const input = { targets: [{ targetType: "object", targetId: "test/object" }] };
    expect(() => parseReconcileProjectionSummariesInput(input))
      .toThrow(ProjectionRecomputeInputError);
  });

  it("9. rejects duplicate { targetType, targetId }", () => {
    const input = {
      targets: [
        { targetType: "object", targetId: "test-object" },
        { targetType: "object", targetId: "test-object" }
      ]
    };
    expect(() => parseReconcileProjectionSummariesInput(input))
      .toThrow(ProjectionRecomputeInputError);
    expect(() => parseReconcileProjectionSummariesInput(input))
      .toThrow("Duplicate target specified");
  });

  it("10. defaults includeSummaries to false", () => {
    const input = { targets: [{ targetType: "object", targetId: "test" }] };
    const result = parseReconcileProjectionSummariesInput(input);
    expect(result.includeSummaries).toBe(false);
  });

  it("11. accepts includeSummaries=true within max 5 targets", () => {
    const targets = Array.from({ length: 5 }).map((_, i) => ({
      targetType: "object",
      targetId: `test-${i}`
    }));
    const input = { targets, includeSummaries: true };
    const result = parseReconcileProjectionSummariesInput(input);
    expect(result.includeSummaries).toBe(true);
    expect(result.targets).toHaveLength(5);
  });

  it("12. rejects includeSummaries=true with more than 5 targets", () => {
    const targets = Array.from({ length: 6 }).map((_, i) => ({
      targetType: "object",
      targetId: `test-${i}`
    }));
    const input = { targets, includeSummaries: true };
    expect(() => parseReconcileProjectionSummariesInput(input))
      .toThrow(ProjectionRecomputeInputError);
    expect(() => parseReconcileProjectionSummariesInput(input))
      .toThrow("Maximum target count exceeded");
  });

  it("13. accepts up to 20 compact targets", () => {
    const targets = Array.from({ length: 20 }).map((_, i) => ({
      targetType: "object",
      targetId: `test-${i}`
    }));
    const input = { targets, includeSummaries: false };
    const result = parseReconcileProjectionSummariesInput(input);
    expect(result.targets).toHaveLength(20);
  });

  it("14. rejects more than 20 compact targets", () => {
    const targets = Array.from({ length: 21 }).map((_, i) => ({
      targetType: "object",
      targetId: `test-${i}`
    }));
    const input = { targets, includeSummaries: false };
    expect(() => parseReconcileProjectionSummariesInput(input))
      .toThrow(ProjectionRecomputeInputError);
    expect(() => parseReconcileProjectionSummariesInput(input))
      .toThrow("Maximum target count exceeded");
  });

  it("15. maps each target to the correct entity collection, summary collection, and summary path", () => {
    const input = {
      targets: [
        { targetType: "object", targetId: "obj-1" },
        { targetType: "marker", targetId: "mrk-1" },
        { targetType: "place", targetId: "plc-1" }
      ]
    };
    const result = parseReconcileProjectionSummariesInput(input);

    expect(result.targets[0].entityCollection).toBe("objects");
    expect(result.targets[0].summaryCollection).toBe("objectSummaries");
    expect(result.targets[0].summaryPath).toBe("objectSummaries/obj-1");

    expect(result.targets[1].entityCollection).toBe("markers");
    expect(result.targets[1].summaryCollection).toBe("markerSummaries");
    expect(result.targets[1].summaryPath).toBe("markerSummaries/mrk-1");

    expect(result.targets[2].entityCollection).toBe("places");
    expect(result.targets[2].summaryCollection).toBe("placeSummaries");
    expect(result.targets[2].summaryPath).toBe("placeSummaries/plc-1");
  });
});

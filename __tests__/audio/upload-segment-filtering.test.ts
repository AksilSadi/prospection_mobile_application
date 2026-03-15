import type { DoorSegment } from "@/services/audio/recordings/recording.types";

function filterSegmentsForUpload(segments: DoorSegment[] | undefined): DoorSegment[] {
  return (
    segments?.filter(
      (s): s is DoorSegment & { endTime: number } =>
        s.endTime !== null && s.endTime - s.startTime >= 5,
    ) ?? []
  );
}

const segment = (
  porteId: number,
  startTime: number,
  endTime: number | null,
): DoorSegment => ({
  porteId,
  numero: String(porteId),
  etage: 1,
  startTime,
  endTime,
});

describe("upload segment filtering", () => {
  it("passes through valid closed segments", () => {
    const input = [
      segment(101, 0, 30),
      segment(102, 35, 215),
    ];
    const result = filterSegmentsForUpload(input);
    expect(result).toHaveLength(2);
    expect(result[0].porteId).toBe(101);
    expect(result[1].porteId).toBe(102);
  });

  it("filters out segments with null endTime", () => {
    const input = [
      segment(101, 0, 30),
      segment(102, 35, null),
    ];
    const result = filterSegmentsForUpload(input);
    expect(result).toHaveLength(1);
    expect(result[0].porteId).toBe(101);
  });

  it("filters out segments shorter than 5s", () => {
    const input = [
      segment(101, 0, 3),
      segment(102, 5, 10.5),
      segment(103, 12, 25),
    ];
    const result = filterSegmentsForUpload(input);
    expect(result).toHaveLength(2);
    expect(result[0].porteId).toBe(102);
    expect(result[1].porteId).toBe(103);
  });

  it("keeps segment with exactly 5s duration", () => {
    const input = [segment(101, 0, 5)];
    const result = filterSegmentsForUpload(input);
    expect(result).toHaveLength(1);
  });

  it("removes segment with 4.99s duration", () => {
    const input = [segment(101, 0, 4.99)];
    const result = filterSegmentsForUpload(input);
    expect(result).toHaveLength(0);
  });

  it("returns empty array for undefined input", () => {
    expect(filterSegmentsForUpload(undefined)).toEqual([]);
  });

  it("returns empty array for empty array input", () => {
    expect(filterSegmentsForUpload([])).toEqual([]);
  });

  it("handles mixed valid and invalid segments", () => {
    const input = [
      segment(101, 0, 30),
      segment(102, 31, null),
      segment(103, 32, 34),
      segment(104, 35, 100),
      segment(105, 101, 103),
    ];
    const result = filterSegmentsForUpload(input);
    expect(result).toHaveLength(2);
    expect(result.map((s) => s.porteId)).toEqual([101, 104]);
  });

  it("preserves segment metadata through filtering", () => {
    const input: DoorSegment[] = [{
      porteId: 301,
      numero: "301",
      etage: 3,
      startTime: 10,
      endTime: 45,
    }];
    const result = filterSegmentsForUpload(input);
    expect(result[0]).toEqual({
      porteId: 301,
      numero: "301",
      etage: 3,
      startTime: 10,
      endTime: 45,
    });
  });

  it("handles large number of segments efficiently", () => {
    const input = Array.from({ length: 500 }, (_, i) => segment(
      i + 1,
      i * 12,
      i * 12 + (i % 3 === 0 ? 3 : 10),
    ));
    const result = filterSegmentsForUpload(input);
    const shortCount = input.filter((s) => (s.endTime! - s.startTime) < 5).length;
    expect(result).toHaveLength(input.length - shortCount);
  });
});

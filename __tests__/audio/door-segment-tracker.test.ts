import { DoorSegmentTracker, type PorteRef } from "@/services/audio/recordings/door-segment-tracker";

const PORTE_101: PorteRef = { id: 101, numero: "101", etage: 1 };
const PORTE_102: PorteRef = { id: 102, numero: "102", etage: 1 };
const PORTE_103: PorteRef = { id: 103, numero: "103", etage: 1 };
const PORTE_201: PorteRef = { id: 201, numero: "201", etage: 2 };
const PORTE_202: PorteRef = { id: 202, numero: "202", etage: 2 };

function createTracker(startMs = 0) {
  let now = startMs;
  const tracker = new DoorSegmentTracker(() => now);
  const advance = (ms: number) => { now += ms; };
  const setTime = (ms: number) => { now = ms; };
  return { tracker, advance, setTime, getTime: () => now };
}

describe("DoorSegmentTracker", () => {
  describe("lifecycle", () => {
    it("starts in idle state", () => {
      const { tracker } = createTracker();
      expect(tracker.isStarted).toBe(false);
      expect(tracker.segmentCount).toBe(0);
      expect(tracker.openSegment).toBeNull();
      expect(tracker.getSegments()).toEqual([]);
    });

    it("start() initializes recording timer", () => {
      const { tracker } = createTracker(1000);
      tracker.start();
      expect(tracker.isStarted).toBe(true);
      expect(tracker.getElapsed()).toBe(0);
    });

    it("getElapsed() returns seconds since start", () => {
      const { tracker, advance } = createTracker(0);
      tracker.start();
      advance(10_000);
      expect(tracker.getElapsed()).toBe(10);
    });

    it("reset() clears everything", () => {
      const { tracker, advance } = createTracker(0);
      tracker.start();
      tracker.markDoorStart(PORTE_101);
      advance(10_000);
      tracker.markDoorEnd(101);
      tracker.reset();
      expect(tracker.isStarted).toBe(false);
      expect(tracker.segmentCount).toBe(0);
      expect(tracker.getSegments()).toEqual([]);
    });

    it("start() after previous session clears old segments", () => {
      const { tracker, advance } = createTracker(0);
      tracker.start();
      tracker.markDoorStart(PORTE_101);
      advance(10_000);
      tracker.markDoorEnd(101);
      expect(tracker.segmentCount).toBe(1);

      tracker.start();
      expect(tracker.segmentCount).toBe(0);
      expect(tracker.getSegments()).toEqual([]);
    });
  });

  describe("markDoorStart", () => {
    it("creates a segment with correct startTime and null endTime", () => {
      const { tracker, advance } = createTracker(0);
      tracker.start();
      advance(5_000);
      tracker.markDoorStart(PORTE_101);

      const segments = tracker.getSegments();
      expect(segments).toHaveLength(1);
      expect(segments[0]).toEqual({
        porteId: 101,
        numero: "101",
        etage: 1,
        startTime: 5,
        endTime: null,
      });
    });

    it("sets openSegment to the newly created segment", () => {
      const { tracker } = createTracker(0);
      tracker.start();
      tracker.markDoorStart(PORTE_101);
      expect(tracker.openSegment).not.toBeNull();
      expect(tracker.openSegment!.porteId).toBe(101);
    });

    it("auto-closes previous segment when opening a new one", () => {
      const { tracker, advance } = createTracker(0);
      tracker.start();
      tracker.markDoorStart(PORTE_101);
      advance(10_000);
      tracker.markDoorStart(PORTE_102);

      const segments = tracker.getSegments();
      expect(segments).toHaveLength(2);
      expect(segments[0].porteId).toBe(101);
      expect(segments[0].endTime).toBe(10);
      expect(segments[1].porteId).toBe(102);
      expect(segments[1].endTime).toBeNull();
    });

    it("discards previous segment if it was shorter than 5s", () => {
      const { tracker, advance } = createTracker(0);
      tracker.start();
      tracker.markDoorStart(PORTE_101);
      advance(3_000);
      tracker.markDoorStart(PORTE_102);

      const segments = tracker.getSegments();
      expect(segments).toHaveLength(1);
      expect(segments[0].porteId).toBe(102);
    });

    it("preserves porte metadata (numero, etage)", () => {
      const { tracker } = createTracker(0);
      tracker.start();
      tracker.markDoorStart(PORTE_201);

      const seg = tracker.getSegments()[0];
      expect(seg.numero).toBe("201");
      expect(seg.etage).toBe(2);
    });
  });

  describe("markDoorEnd", () => {
    it("closes the segment for the given porteId", () => {
      const { tracker, advance } = createTracker(0);
      tracker.start();
      tracker.markDoorStart(PORTE_101);
      advance(10_000);
      tracker.markDoorEnd(101);

      const segments = tracker.getSegments();
      expect(segments).toHaveLength(1);
      expect(segments[0].endTime).toBe(10);
      expect(tracker.openSegment).toBeNull();
    });

    it("discards segment if duration < 5s", () => {
      const { tracker, advance } = createTracker(0);
      tracker.start();
      tracker.markDoorStart(PORTE_101);
      advance(3_000);
      tracker.markDoorEnd(101);

      expect(tracker.getSegments()).toHaveLength(0);
      expect(tracker.openSegment).toBeNull();
    });

    it("keeps segment if duration exactly 5s", () => {
      const { tracker, advance } = createTracker(0);
      tracker.start();
      tracker.markDoorStart(PORTE_101);
      advance(5_000);
      tracker.markDoorEnd(101);

      expect(tracker.getSegments()).toHaveLength(1);
      expect(tracker.getSegments()[0].endTime).toBe(5);
    });

    it("is a no-op if porteId has no open segment", () => {
      const { tracker } = createTracker(0);
      tracker.start();
      tracker.markDoorEnd(999);
      expect(tracker.getSegments()).toHaveLength(0);
    });

    it("is a no-op if segment was already closed", () => {
      const { tracker, advance } = createTracker(0);
      tracker.start();
      tracker.markDoorStart(PORTE_101);
      advance(10_000);
      tracker.markDoorEnd(101);
      advance(5_000);
      tracker.markDoorEnd(101);

      expect(tracker.getSegments()).toHaveLength(1);
      expect(tracker.getSegments()[0].endTime).toBe(10);
    });

    it("only closes the open segment for that porteId", () => {
      const { tracker, advance } = createTracker(0);
      tracker.start();
      tracker.markDoorStart(PORTE_101);
      advance(10_000);
      tracker.markDoorEnd(101);
      advance(2_000);
      tracker.markDoorStart(PORTE_102);
      advance(8_000);

      tracker.markDoorEnd(101);
      const seg102 = tracker.getSegments().find((s) => s.porteId === 102);
      expect(seg102!.endTime).toBeNull();
    });
  });

  describe("closeAll", () => {
    it("closes all open segments", () => {
      const { tracker, advance } = createTracker(0);
      tracker.start();
      tracker.markDoorStart(PORTE_101);
      advance(10_000);
      tracker.markDoorEnd(101);
      advance(2_000);
      tracker.markDoorStart(PORTE_102);
      advance(8_000);

      tracker.closeAll();
      const segments = tracker.getSegments();
      expect(segments).toHaveLength(2);
      expect(segments.every((s) => s.endTime !== null)).toBe(true);
    });

    it("discards open segments shorter than 5s", () => {
      const { tracker, advance } = createTracker(0);
      tracker.start();
      tracker.markDoorStart(PORTE_101);
      advance(10_000);
      tracker.markDoorEnd(101);
      advance(1_000);
      tracker.markDoorStart(PORTE_102);
      advance(3_000);

      tracker.closeAll();
      const segments = tracker.getSegments();
      expect(segments).toHaveLength(1);
      expect(segments[0].porteId).toBe(101);
    });

    it("handles empty tracker", () => {
      const { tracker } = createTracker(0);
      tracker.start();
      tracker.closeAll();
      expect(tracker.getSegments()).toEqual([]);
    });
  });

  describe("getClosedSegments", () => {
    it("returns only segments with non-null endTime", () => {
      const { tracker, advance } = createTracker(0);
      tracker.start();
      tracker.markDoorStart(PORTE_101);
      advance(10_000);
      tracker.markDoorEnd(101);
      tracker.markDoorStart(PORTE_102);

      const closed = tracker.getClosedSegments();
      expect(closed).toHaveLength(1);
      expect(closed[0].porteId).toBe(101);
      expect(closed[0].endTime).toBe(10);
    });
  });

  describe("accidental swipe scenarios", () => {
    it("quick swipe away and back: discards the accidental segment", () => {
      const { tracker, advance } = createTracker(0);
      tracker.start();
      tracker.markDoorStart(PORTE_101);
      advance(15_000);
      tracker.markDoorStart(PORTE_102);
      advance(2_000);
      tracker.markDoorStart(PORTE_101);
      advance(10_000);
      tracker.markDoorEnd(101);

      const segments = tracker.getClosedSegments();
      expect(segments).toHaveLength(2);
      expect(segments[0].porteId).toBe(101);
      expect(segments[0].endTime).toBe(15);
      expect(segments[1].porteId).toBe(101);
      expect(segments[1].startTime).toBe(17);
      expect(segments[1].endTime).toBe(27);
    });

    it("rapid triple swipe: only keeps segments >= 5s", () => {
      const { tracker, advance } = createTracker(0);
      tracker.start();
      tracker.markDoorStart(PORTE_101);
      advance(2_000);
      tracker.markDoorStart(PORTE_102);
      advance(1_000);
      tracker.markDoorStart(PORTE_103);
      advance(10_000);
      tracker.markDoorEnd(103);

      const segments = tracker.getClosedSegments();
      expect(segments).toHaveLength(1);
      expect(segments[0].porteId).toBe(103);
    });

    it("swipe to wrong door and immediate markDoorEnd: discards it", () => {
      const { tracker, advance } = createTracker(0);
      tracker.start();
      tracker.markDoorStart(PORTE_101);
      advance(10_000);
      tracker.markDoorEnd(101);
      tracker.markDoorStart(PORTE_102);
      advance(2_000);
      tracker.markDoorEnd(102);

      const segments = tracker.getClosedSegments();
      expect(segments).toHaveLength(1);
      expect(segments[0].porteId).toBe(101);
    });
  });

  describe("real prospection scenario", () => {
    it("full building visit: 5 doors with varied statuses", () => {
      const { tracker, advance } = createTracker(0);
      tracker.start();

      tracker.markDoorStart(PORTE_101);
      advance(30_000);
      tracker.markDoorEnd(101);

      advance(5_000);
      tracker.markDoorStart(PORTE_102);
      advance(180_000);
      tracker.markDoorEnd(102);

      advance(3_000);
      tracker.markDoorStart(PORTE_103);
      advance(10_000);
      tracker.markDoorEnd(103);

      advance(2_000);
      tracker.markDoorStart(PORTE_201);
      advance(60_000);
      tracker.markDoorEnd(201);

      advance(3_000);
      tracker.markDoorStart(PORTE_202);
      advance(45_000);

      tracker.closeAll();

      const segments = tracker.getClosedSegments();
      expect(segments).toHaveLength(5);

      expect(segments[0]).toEqual({
        porteId: 101, numero: "101", etage: 1,
        startTime: 0, endTime: 30,
      });
      expect(segments[1]).toEqual({
        porteId: 102, numero: "102", etage: 1,
        startTime: 35, endTime: 215,
      });
      expect(segments[2]).toEqual({
        porteId: 103, numero: "103", etage: 1,
        startTime: 218, endTime: 228,
      });
      expect(segments[3]).toEqual({
        porteId: 201, numero: "201", etage: 2,
        startTime: 230, endTime: 290,
      });
      expect(segments[4]).toEqual({
        porteId: 202, numero: "202", etage: 2,
        startTime: 293, endTime: 338,
      });

      const totalTracked = segments.reduce((sum, s) => sum + (s.endTime! - s.startTime), 0);
      expect(totalTracked).toBe(30 + 180 + 10 + 60 + 45);
    });

    it("commercial visits same door twice (repassage)", () => {
      const { tracker, advance } = createTracker(0);
      tracker.start();

      tracker.markDoorStart(PORTE_101);
      advance(20_000);
      tracker.markDoorEnd(101);

      advance(120_000);

      tracker.markDoorStart(PORTE_101);
      advance(30_000);
      tracker.markDoorEnd(101);

      const segments = tracker.getClosedSegments();
      expect(segments).toHaveLength(2);
      expect(segments[0].porteId).toBe(101);
      expect(segments[0].startTime).toBe(0);
      expect(segments[0].endTime).toBe(20);
      expect(segments[1].porteId).toBe(101);
      expect(segments[1].startTime).toBe(140);
      expect(segments[1].endTime).toBe(170);
    });

    it("recording with only absent doors (quick taps)", () => {
      const { tracker, advance } = createTracker(0);
      tracker.start();

      tracker.markDoorStart(PORTE_101);
      advance(6_000);
      tracker.markDoorEnd(101);

      tracker.markDoorStart(PORTE_102);
      advance(7_000);
      tracker.markDoorEnd(102);

      tracker.markDoorStart(PORTE_103);
      advance(5_000);
      tracker.markDoorEnd(103);

      const segments = tracker.getClosedSegments();
      expect(segments).toHaveLength(3);
    });

    it("commercial opens building but interacts with zero doors", () => {
      const { tracker, advance } = createTracker(0);
      tracker.start();
      advance(30_000);
      tracker.closeAll();

      expect(tracker.getClosedSegments()).toEqual([]);
    });

    it("commercial opens building, swipes around without updating statuses, then leaves", () => {
      const { tracker, advance } = createTracker(0);
      tracker.start();

      tracker.markDoorStart(PORTE_101);
      advance(3_000);
      tracker.markDoorStart(PORTE_102);
      advance(2_000);
      tracker.markDoorStart(PORTE_103);
      advance(4_000);

      tracker.closeAll();

      expect(tracker.getClosedSegments()).toEqual([]);
    });

    it("long interaction on a single door (contract signing)", () => {
      const { tracker, advance } = createTracker(0);
      tracker.start();

      tracker.markDoorStart(PORTE_101);
      advance(600_000);
      tracker.markDoorEnd(101);

      const segments = tracker.getClosedSegments();
      expect(segments).toHaveLength(1);
      expect(segments[0].endTime! - segments[0].startTime).toBe(600);
    });
  });

  describe("edge cases", () => {
    it("markDoorStart before start() uses elapsed 0", () => {
      const { tracker } = createTracker(0);
      tracker.markDoorStart(PORTE_101);

      const segments = tracker.getSegments();
      expect(segments).toHaveLength(1);
      expect(segments[0].startTime).toBe(0);
    });

    it("markDoorEnd before start() is a no-op on non-existent segment", () => {
      const { tracker } = createTracker(0);
      tracker.markDoorEnd(101);
      expect(tracker.getSegments()).toEqual([]);
    });

    it("getSegments returns a copy, not the internal array", () => {
      const { tracker } = createTracker(0);
      tracker.start();
      tracker.markDoorStart(PORTE_101);

      const segs1 = tracker.getSegments();
      const segs2 = tracker.getSegments();
      expect(segs1).not.toBe(segs2);
      expect(segs1).toEqual(segs2);
    });

    it("segment at exactly the 5s boundary is kept", () => {
      const { tracker, advance } = createTracker(0);
      tracker.start();
      tracker.markDoorStart(PORTE_101);
      advance(5_000);
      tracker.markDoorEnd(101);

      expect(tracker.getClosedSegments()).toHaveLength(1);
    });

    it("segment at 4999ms is discarded", () => {
      const { tracker, advance } = createTracker(0);
      tracker.start();
      tracker.markDoorStart(PORTE_101);
      advance(4_999);
      tracker.markDoorEnd(101);

      expect(tracker.getClosedSegments()).toHaveLength(0);
    });

    it("many doors in sequence maintain correct timestamps", () => {
      const { tracker, advance } = createTracker(0);
      tracker.start();

      const doors: PorteRef[] = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        numero: String(i + 1),
        etage: Math.floor(i / 5) + 1,
      }));

      for (const door of doors) {
        tracker.markDoorStart(door);
        advance(10_000);
        tracker.markDoorEnd(door.id);
        advance(2_000);
      }

      const segments = tracker.getClosedSegments();
      expect(segments).toHaveLength(20);

      for (let i = 0; i < segments.length; i++) {
        expect(segments[i].porteId).toBe(i + 1);
        expect(segments[i].endTime! - segments[i].startTime).toBe(10);
      }

      expect(segments[0].startTime).toBe(0);
      expect(segments[0].endTime).toBe(10);
      expect(segments[19].startTime).toBe(228);
      expect(segments[19].endTime).toBe(238);
    });
  });

  describe("segment timing precision", () => {
    it("segments have no overlap", () => {
      const { tracker, advance } = createTracker(0);
      tracker.start();

      tracker.markDoorStart(PORTE_101);
      advance(10_000);
      tracker.markDoorStart(PORTE_102);
      advance(10_000);
      tracker.markDoorStart(PORTE_103);
      advance(10_000);
      tracker.closeAll();

      const segments = tracker.getClosedSegments();
      for (let i = 1; i < segments.length; i++) {
        expect(segments[i].startTime).toBeGreaterThanOrEqual(segments[i - 1].endTime!);
      }
    });

    it("auto-close sets endTime equal to next segment startTime", () => {
      const { tracker, advance } = createTracker(0);
      tracker.start();

      tracker.markDoorStart(PORTE_101);
      advance(10_000);
      tracker.markDoorStart(PORTE_102);

      const segments = tracker.getSegments();
      expect(segments[0].endTime).toBe(segments[1].startTime);
    });

    it("gap between manual close and next open is preserved", () => {
      const { tracker, advance } = createTracker(0);
      tracker.start();

      tracker.markDoorStart(PORTE_101);
      advance(10_000);
      tracker.markDoorEnd(101);
      advance(5_000);
      tracker.markDoorStart(PORTE_102);
      advance(10_000);
      tracker.markDoorEnd(102);

      const segments = tracker.getClosedSegments();
      const gap = segments[1].startTime - segments[0].endTime!;
      expect(gap).toBe(5);
    });
  });
});

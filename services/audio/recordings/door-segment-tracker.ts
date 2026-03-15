import type { DoorSegment } from "./recording.types";

export type PorteRef = {
  id: number;
  numero: string;
  etage: number;
};

const MIN_SEGMENT_DURATION_S = 5;

export class DoorSegmentTracker {
  private segments: DoorSegment[] = [];
  private recordingStartTime = 0;
  private started = false;
  private nowFn: () => number;

  constructor(nowFn: () => number = Date.now) {
    this.nowFn = nowFn;
  }

  start(): void {
    this.segments = [];
    this.recordingStartTime = this.nowFn();
    this.started = true;
  }

  getElapsed(): number {
    if (!this.started) return 0;
    return (this.nowFn() - this.recordingStartTime) / 1000;
  }

  markDoorStart(porte: PorteRef): void {
    const elapsed = this.getElapsed();

    const open = this.segments.find((s) => s.endTime === null);
    if (open) {
      const duration = elapsed - open.startTime;
      if (duration < MIN_SEGMENT_DURATION_S) {
        this.segments = this.segments.filter((s) => s !== open);
      } else {
        open.endTime = elapsed;
      }
    }

    this.segments.push({
      porteId: porte.id,
      numero: porte.numero,
      etage: porte.etage,
      startTime: elapsed,
      endTime: null,
    });
  }

  markDoorEnd(porteId: number, statut?: string): void {
    const segment = this.segments.find(
      (s) => s.porteId === porteId && s.endTime === null,
    );
    if (!segment) return;

    const elapsed = this.getElapsed();
    const duration = elapsed - segment.startTime;

    if (duration < MIN_SEGMENT_DURATION_S) {
      this.segments = this.segments.filter((s) => s !== segment);
      return;
    }

    segment.endTime = elapsed;
    if (statut) segment.statut = statut;
  }

  closeAll(): void {
    const elapsed = this.getElapsed();
    for (const segment of this.segments) {
      if (segment.endTime === null) {
        const duration = elapsed - segment.startTime;
        if (duration >= MIN_SEGMENT_DURATION_S) {
          segment.endTime = elapsed;
        }
      }
    }
    this.segments = this.segments.filter((s) => s.endTime !== null);
  }

  getSegments(): DoorSegment[] {
    return [...this.segments];
  }

  getClosedSegments(): DoorSegment[] {
    return this.segments.filter(
      (s): s is DoorSegment & { endTime: number } => s.endTime !== null,
    );
  }

  reset(): void {
    this.segments = [];
    this.recordingStartTime = 0;
    this.started = false;
  }

  get isStarted(): boolean {
    return this.started;
  }

  get segmentCount(): number {
    return this.segments.length;
  }

  get openSegment(): DoorSegment | null {
    return this.segments.find((s) => s.endTime === null) ?? null;
  }
}

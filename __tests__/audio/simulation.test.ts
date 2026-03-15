import { DoorSegmentTracker, type PorteRef } from "@/services/audio/recordings/door-segment-tracker";

function formatTime(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${String(sec).padStart(2, "0")}`;
}

describe("Simulation: visite complète d'un immeuble", () => {
  it("simule un commercial qui visite 5 portes avec différents statuts", () => {
    let now = 0;
    const tracker = new DoorSegmentTracker(() => now);

    const portes: PorteRef[] = [
      { id: 301, numero: "301", etage: 3 },
      { id: 302, numero: "302", etage: 3 },
      { id: 303, numero: "303", etage: 3 },
      { id: 201, numero: "201", etage: 2 },
      { id: 202, numero: "202", etage: 2 },
    ];

    const log: string[] = [];

    log.push("=== SIMULATION: Visite immeuble 12 rue de la Paix ===\n");

    // Recording démarre
    tracker.start();
    log.push(`[00:00] 🔴 Recording démarré`);

    // Porte 301 — Contrat signé (longue discussion)
    now += 5_000;
    tracker.markDoorStart(portes[0]);
    log.push(`[${formatTime(now / 1000)}] 🚪 Porte 301 — Commercial commence`);
    now += 180_000;
    tracker.markDoorEnd(301);
    log.push(`[${formatTime(now / 1000)}] ✅ Porte 301 — CONTRAT_SIGNE (3 min de discussion)`);

    // Déplacement vers 302
    now += 15_000;

    // Porte 302 — Swipe accidentel, revient à 301, puis va à 302
    tracker.markDoorStart(portes[0]); // Swipe accidentel vers 301
    log.push(`[${formatTime(now / 1000)}] 🚪 Porte 301 — Swipe accidentel`);
    now += 2_000;
    tracker.markDoorStart(portes[1]); // Corrige vers 302
    log.push(`[${formatTime(now / 1000)}] 🚪 Porte 302 — Commercial commence (swipe corrigé)`);
    now += 30_000;
    tracker.markDoorEnd(302);
    log.push(`[${formatTime(now / 1000)}] ❌ Porte 302 — REFUS (30s)`);

    // Déplacement vers 303
    now += 10_000;

    // Porte 303 — Absent (rapide)
    tracker.markDoorStart(portes[2]);
    log.push(`[${formatTime(now / 1000)}] 🚪 Porte 303 — Commercial toque`);
    now += 8_000;
    tracker.markDoorEnd(303);
    log.push(`[${formatTime(now / 1000)}] 🏠 Porte 303 — ABSENT (8s, personne n'ouvre)`);

    // Descend au 2ème étage
    now += 30_000;

    // Porte 201 — RDV pris (discussion moyenne)
    tracker.markDoorStart(portes[3]);
    log.push(`[${formatTime(now / 1000)}] 🚪 Porte 201 — Commercial commence`);
    now += 60_000;
    tracker.markDoorEnd(201);
    log.push(`[${formatTime(now / 1000)}] 📅 Porte 201 — RDV_PRIS (1 min)`);

    // Porte 202 — Argumenté (discussion longue)
    now += 5_000;
    tracker.markDoorStart(portes[4]);
    log.push(`[${formatTime(now / 1000)}] 🚪 Porte 202 — Commercial commence`);
    now += 120_000;

    // Commercial quitte — closeAll
    tracker.closeAll();
    log.push(`[${formatTime(now / 1000)}] ⏹️  Recording arrêté — closeAll()`);

    // Résultats
    const segments = tracker.getClosedSegments();

    log.push(`\n=== RÉSULTAT: ${segments.length} segments valides ===\n`);
    log.push("┌──────────┬───────────────┬──────────────┬──────────┐");
    log.push("│ Porte    │ Début         │ Fin          │ Durée    │");
    log.push("├──────────┼───────────────┼──────────────┼──────────┤");

    for (const seg of segments) {
      const dur = seg.endTime! - seg.startTime;
      log.push(
        `│ ${seg.numero.padEnd(8)} │ ${formatTime(seg.startTime).padEnd(13)} │ ${formatTime(seg.endTime!).padEnd(12)} │ ${formatTime(dur).padEnd(8)} │`
      );
    }

    log.push("└──────────┴───────────────┴──────────────┴──────────┘");

    const totalTracked = segments.reduce((sum, s) => sum + (s.endTime! - s.startTime), 0);
    const totalRecording = now / 1000;
    log.push(`\nTemps total recording: ${formatTime(totalRecording)}`);
    log.push(`Temps total suivi:    ${formatTime(totalTracked)}`);
    log.push(`Temps non-suivi:      ${formatTime(totalRecording - totalTracked)} (déplacements, silences)`);
    log.push(`Swipe accidentel:     1 (< 5s, auto-discarded)`);

    // Print simulation
    console.log(log.join("\n"));

    // Assertions
    expect(segments).toHaveLength(5);

    expect(segments[0].porteId).toBe(301);
    expect(segments[0].endTime! - segments[0].startTime).toBe(180);

    expect(segments[1].porteId).toBe(302);
    expect(segments[1].endTime! - segments[1].startTime).toBe(30);

    expect(segments[2].porteId).toBe(303);
    expect(segments[2].endTime! - segments[2].startTime).toBe(8);

    expect(segments[3].porteId).toBe(201);
    expect(segments[3].endTime! - segments[3].startTime).toBe(60);

    expect(segments[4].porteId).toBe(202);
    expect(segments[4].endTime! - segments[4].startTime).toBe(120);
  });
});

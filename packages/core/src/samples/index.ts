import type { CheckId } from "../checks";
import { HANDBOOK } from "./handbook-en";

export type Sample = {
  id: string;
  language: "en" | "de";
  title: string;
  question: string;
  sources: string[];
  /** The whole document, for the Scope check. */
  document: string;
  faithful: string;
  drifted: string;
  /** The check the drifted answer fails. */
  catches: CheckId;
};

/** A synthetic German handbook. Not a real company's policy. */
export const HANDBUCH = [
  "Geltungsbereich. Diese Richtlinie gilt nur für Beschäftigte der Muster GmbH in Deutschland. Sie gilt nicht für Leiharbeitskräfte oder freie Mitarbeitende.",
  "Urlaub. Vollzeitbeschäftigte erhalten nach der Probezeit 30 Urlaubstage pro Kalenderjahr. Teilzeitkräfte erhalten einen Anteil, der ihrer vertraglichen Arbeitszeit entspricht.",
  "Mobiles Arbeiten. Mobiles Arbeiten ist an bis zu 2 Tagen pro Woche möglich, es sei denn, die Rolle erfordert Anwesenheit beim Kunden.",
  "Weiterbildung. Das Weiterbildungsbudget beträgt 1.200 € pro Jahr.",
].join("\n\n");

function paragraph(document: string, heading: string): string {
  const found = document.split(/\n\s*\n/).find((p) => p.startsWith(`${heading}.`));
  if (!found) throw new Error(`No paragraph "${heading}"`);
  return found;
}

export { HANDBOOK };

export const SAMPLES: Sample[] = [
  {
    id: "leave",
    language: "en",
    title: "Leave, with a condition dropped",
    question: "How many days of annual leave do employees get?",
    sources: [paragraph(HANDBOOK, "Annual leave")],
    document: HANDBOOK,
    faithful: "Full-time employees only receive 30 days of paid annual leave after the probation period.",
    drifted: "Employees receive 30 days of paid annual leave.",
    catches: "qualifier",
  },
  {
    id: "telework",
    language: "en",
    title: "Telework, with the unless dropped",
    question: "May I work from home for 2 days a week?",
    sources: [paragraph(HANDBOOK, "Telework")],
    document: HANDBOOK,
    faithful: "Staff may telework from their registered home address for up to 2 days each week, unless they are in the probation period.",
    drifted: "Staff may telework from their registered home address for up to 2 days each week.",
    catches: "omission",
  },
  {
    id: "everyone",
    language: "en",
    title: "Who it applies to, widened",
    question: "Does every worker get these benefits?",
    sources: [paragraph(HANDBOOK, "Who this text is for")],
    document: HANDBOOK,
    faithful: "This handbook applies only to people employed by Linden Atelier who work in Germany.",
    drifted: "Every worker gets these benefits.",
    catches: "scope",
  },
  {
    id: "urlaub",
    language: "de",
    title: "Urlaub, Bedingung weggelassen",
    question: "Wie viele Urlaubstage bekommen Vollzeitbeschäftigte?",
    sources: [paragraph(HANDBUCH, "Urlaub")],
    document: HANDBUCH,
    faithful: "Vollzeitbeschäftigte erhalten nach der Probezeit 30 Urlaubstage pro Kalenderjahr.",
    drifted: "Vollzeitbeschäftigte erhalten 30 Urlaubstage pro Kalenderjahr.",
    catches: "qualifier",
  },
  {
    id: "mobil",
    language: "de",
    title: "Mobiles Arbeiten, Ausnahme weggelassen",
    question: "Wie viele Tage darf ich mobil arbeiten?",
    sources: [paragraph(HANDBUCH, "Mobiles Arbeiten")],
    document: HANDBUCH,
    faithful: "Mobiles Arbeiten ist an bis zu 2 Tagen pro Woche möglich, es sei denn, die Rolle erfordert Anwesenheit beim Kunden.",
    drifted: "Mobiles Arbeiten ist an bis zu 2 Tagen pro Woche möglich.",
    catches: "omission",
  },
  {
    id: "bonus",
    language: "de",
    title: "Urlaub, mit erfundenem Satz",
    question: "Wie viele Urlaubstage bekommen Vollzeitbeschäftigte?",
    sources: [paragraph(HANDBUCH, "Urlaub")],
    document: HANDBUCH,
    faithful: "Vollzeitbeschäftigte erhalten nach der Probezeit 30 Urlaubstage pro Kalenderjahr.",
    drifted: "Vollzeitbeschäftigte erhalten nach der Probezeit 30 Urlaubstage pro Kalenderjahr. Zusätzlich gibt es einen Bonus für alle Abteilungen.",
    catches: "support",
  },
];

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Die Paraglide-Meldungen werden erst beim Build erzeugt, ein Tippfehler in
 * `m.foo()` faellt also erst zur Laufzeit auf. Dieser Test vergleicht die im
 * Code verwendeten Schluessel direkt gegen die Meldungsdateien.
 */

const ROOT = join(import.meta.dirname, '..', '..', '..');
const QUELLEN = join(ROOT, 'src');
const SCHLUESSEL_MUSTER = /\bm\.([a-zA-Z0-9_]+)\s*\(/g;

function dateienUnter(verzeichnis: string): string[] {
	return readdirSync(verzeichnis).flatMap((eintrag) => {
		const pfad = join(verzeichnis, eintrag);
		if (statSync(pfad).isDirectory()) {
			// Der generierte Paraglide-Ordner definiert die Meldungen selbst.
			return eintrag === 'paraglide' ? [] : dateienUnter(pfad);
		}
		return /\.(ts|svelte)$/.test(eintrag) && !eintrag.endsWith('.test.ts') ? [pfad] : [];
	});
}

function verwendeteSchluessel(): Map<string, string[]> {
	const treffer = new Map<string, string[]>();

	for (const pfad of dateienUnter(QUELLEN)) {
		const inhalt = readFileSync(pfad, 'utf-8');
		for (const match of inhalt.matchAll(SCHLUESSEL_MUSTER)) {
			const schluessel = match[1];
			treffer.set(schluessel, [...(treffer.get(schluessel) ?? []), pfad.slice(ROOT.length + 1)]);
		}
	}

	return treffer;
}

function meldungen(locale: string): Record<string, string> {
	return JSON.parse(readFileSync(join(ROOT, 'messages', `${locale}.json`), 'utf-8'));
}

describe('Meldungsschluessel', () => {
	const verwendet = verwendeteSchluessel();
	const de = meldungen('de');

	it('findet ueberhaupt Verwendungen', () => {
		expect(verwendet.size).toBeGreaterThan(50);
	});

	it('kennt jeden im Code verwendeten Schluessel in de.json', () => {
		const fehlend = [...verwendet.entries()]
			.filter(([schluessel]) => !(schluessel in de))
			.map(([schluessel, dateien]) => `${schluessel} (${dateien.join(', ')})`);

		expect(fehlend).toEqual([]);
	});

	it('haelt it.json frei von Schluesseln, die es in de.json nicht gibt', () => {
		const it = meldungen('it');
		const ueberzaehlig = Object.keys(it).filter((schluessel) => !(schluessel in de));

		expect(ueberzaehlig).toEqual([]);
	});
});

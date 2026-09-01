#!/usr/bin/env python3
"""Extrahiert das Wochenschema-Raster eines SBB-Jahrestourenplan-PDFs als JSON.

Dev-Werkzeug, kein Teil des Extension-Builds.

    pip install pymupdf
    python scripts/extract-jahrestourenplan.py Olten_2026.pdf \
        src/background/data/jahrestourenplaene/olten-2026.json OL

Warum so umstaendlich: die PDFs haben keine Textebene. Ziffern und Buchstaben
sind als Vektorpfade gezeichnet. Das Skript clustert die Pfade und lernt die
Zeichenbelegung aus der "Nr"-Spalte, die bekanntermassen 1..N durchzaehlt.
Buchstaben ergeben sich daraus, dass in der Wochentabelle nur die Tokens
"RT", "CT" und "RES" vorkommen.

Kopfdaten (Gruppenname, Wochenschema, Gueltigkeit) werden nicht aus den
Vektorpfaden gelesen, sondern in PAGES/PLAN konfiguriert -- sie stehen einmal
pro Seite und sind mit blossem Auge schneller korrekt erfasst als per Heuristik.
"""

import collections
import json
import sys

try:
    import pymupdf
except ImportError:  # pragma: no cover - dev tooling
    sys.exit("pymupdf fehlt: pip install pymupdf")

PagesConst = "Pages"
PlanConst = "Plan"


PLAN_OL = {
    "version": 1,
    "depot": "OL",
    "jahr": 2026,
    "gueltigVon": "2025-12-14",
    "gueltigBis": "2026-12-12",
}

# Seitenindex (0-basiert) -> Kopfdaten der Gruppe auf dieser Seite.
PAGES_OL = {
    22: {"gruppe": "Gruppe 1", "wochenschema": "SCP_OL-OL 001-Lokführer-Gruppe 1"},
    48: {"gruppe": "Gruppe 2", "wochenschema": "SCP_OL-OL 002-Lokführer-Gruppe 2"},
    54: {"gruppe": "Gruppe 31 RES", "wochenschema": "SCP_OL-OL 031-Lokführer-Gruppe 31 RES"},
}

PLAN_BS = {
    "version": 1,
    "depot": "BS",
    "jahr": 2026,
    "gueltigVon": "2025-12-14",
    "gueltigBis": "2026-12-12",
}

PAGES_BS = {
    13: {"gruppe": "Gruppe 1", "wochenschema": "SCP_BS-BS 001-Lokführer-Gruppe 1"},
    27: {"gruppe": "Gruppe 2", "wochenschema": "SCP_BS-BS 002-Lokführer-Gruppe 2"},
    40: {"gruppe": "Gruppe 11 ETR", "wochenschema": "SCP_BS-BS 011-Lokführer-Gruppe 11 ETR"},
    55: {"gruppe": "Gruppe 13 ICE", "wochenschema": "SCP_BS-BS 013-Lokführer-Gruppe 13 ICE"},
    64: {"gruppe": "Gruppe 31 RES", "wochenschema": "SCP_BS-BS 031-Lokführer-Gruppe 31 RES"},
    74: {"gruppe": "Gruppe 32 RES", "wochenschema": "SCP_BS-BS 032-Lokführer-Gruppe 32 RES"},
    76: {"gruppe": "Gruppe 33 RES", "wochenschema": "SCP_BS-BS 033-Lokführer-Gruppe 33 RES"},
    78: {"gruppe": "Gruppe 34 RES", "wochenschema": "SCP_BS-BS 034-Lokführer-Gruppe 34 RES"},
}

PLAN_AA = {
    "version": 1,
    "depot": "AA",
    "jahr": 2026,
    "gueltigVon": "2025-12-14",
    "gueltigBis": "2026-12-12",
}

PAGES_AA = {
    9: {"gruppe": "Gruppe 31 RES", "wochenschema": "SCP_AA-AA 031-Lokführer-Gruppe 31 RES"},
    10: {"gruppe": "Gruppe 1", "wochenschema": "SCP_AA-AA 001-Lokführer-Gruppe 1"},
}

DEPOTS = {
    "OL": {
        PlanConst: PLAN_OL,
        PagesConst: PAGES_OL,
    },
    "BS": {
        PlanConst: PLAN_BS,
        PagesConst: PAGES_BS,
    },
    "AA": {
        PlanConst: PLAN_AA,
        PagesConst: PAGES_AA,
    }
}

# Oberkante der Datenzeilen; darueber stehen nur Kopf- und Summenzeilen.
DATA_TOP = 145.0

WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]


def glyph_key(drawing):
    """Formsignatur eines Glyphs: Pfadkommandos plus grob gerasterte Groesse.

    Die Groesse muss mit rein, weil dieselbe Glyphenform in zwei Schriftgraden
    vorkommt -- aber nur grob, sonst zerfaellt ein Zeichen an einer
    Rundungsgrenze (z.B. Hoehe 3.649 vs. 3.651) in zwei Cluster.
    """
    rect = drawing["rect"]
    commands = "".join(item[0] for item in drawing["items"])
    return (commands, round(rect.width * 2) / 2, round(rect.height))


def glyphs(page):
    out = []
    for drawing in page.get_drawings():
        rect = drawing["rect"]
        if rect.width < 8 and 0.5 < rect.height < 6:
            out.append((rect, glyph_key(drawing)))
    return out


def group_rows(items, x0, x1, y_tolerance=1.2):
    selected = [g for g in items if x0 <= g[0].x0 < x1]
    selected.sort(key=lambda g: (g[0].y0, g[0].x0))

    rows, current, row_y = [], [], None
    for glyph in selected:
        if row_y is None or abs(glyph[0].y0 - row_y) <= y_tolerance:
            current.append(glyph)
            row_y = glyph[0].y0 if row_y is None else row_y
        else:
            rows.append(current)
            current, row_y = [glyph], glyph[0].y0
    if current:
        rows.append(current)
    return rows


def vertical_rules(page, x_min, x_max):
    rules = {}
    for drawing in page.get_drawings():
        rect = drawing["rect"]
        if rect.width < 2.5 and rect.height > 200 and x_min < rect.x0 < x_max:
            rules[round(rect.x0, 1)] = rect.height
    return rules


def nr_column(page):
    """Die "Nr"-Spalte des linken Blocks: zwischen Blockrand und erstem Trenner."""
    rules = vertical_rules(page, 0.0, 300.0)
    if not rules:
        raise SystemExit("Linker Block nicht gefunden: keine vertikalen Linien")

    border = max(rules, key=lambda x: rules[x])
    separators = sorted(x for x in rules if x > border)
    if not separators:
        raise SystemExit("Nr-Spalte nicht abgrenzbar")
    return border, separators[0]


def right_block_columns(page):
    """Die 8 Spalten (Woche + So..Sa) des rechten Blocks aus den Trennlinien."""
    # Untergrenze niedrig genug, weil die Blockbreite je nach Wochenanzahl und
    # Depot leicht schwankt und der linke Blockrand sonst abgeschnitten wird.
    rules = vertical_rules(page, 400.0, 10_000.0)
    if not rules:
        raise SystemExit("Rechter Block nicht gefunden: keine vertikalen Linien")

    tallest = max(rules.values())
    borders = sorted(x for x, h in rules.items() if h > tallest - 5)
    if len(borders) < 2:
        raise SystemExit("Blockraender des rechten Blocks nicht eindeutig")

    left, right = borders[-2], borders[-1]
    separators = sorted(x for x in rules if left < x < right)
    if len(separators) != 7:
        raise SystemExit(f"Erwartet 7 Spaltentrenner, gefunden {len(separators)}")

    return [left] + separators + [right]


def cells(row, columns):
    out = [[] for _ in range(len(columns) - 1)]
    for glyph in sorted(row, key=lambda g: g[0].x0):
        for index in range(len(columns) - 1):
            if columns[index] - 0.3 <= glyph[0].x0 < columns[index + 1] - 0.3:
                out[index].append(glyph)
                break
    return out


def numbered_column_rows(items, column):
    """Zeilen einer rechtsbuendigen, von 1..N durchnummerierten Spalte."""
    left, right = column
    return [
        r
        for r in group_rows(items, left, right)
        # Die Nummern sind rechtsbuendig; alles andere in der Spalte ist Beiwerk.
        if r and r[0][0].y0 > DATA_TOP and max(g[0].x1 for g in r) > right - 4
    ]


def learn_digits(glyph_rows, seen=None, label=""):
    """Ziffernbelegung aus einer Spalte lernen, die bekannt 1..N durchzaehlt.

    Die Tabelle benutzt je nach Block unterschiedliche Schriftgroessen, und die
    Groesse steckt in der Formsignatur. Deshalb wird aus jeder nummerierten
    Spalte einzeln gelernt und das Ergebnis zusammengefuehrt.
    """
    seen = collections.defaultdict(set) if seen is None else seen
    for number, keys in enumerate(glyph_rows, start=1):
        text = str(number)
        if len(keys) != len(text):
            raise SystemExit(f"{label}Zeile {number} hat {len(keys)} Glyphen, erwartet {len(text)}")
        for key, char in zip(keys, text):
            seen[key].add(char)

    ambiguous = {k: v for k, v in seen.items() if len(v) > 1}
    if ambiguous:
        raise SystemExit(f"{label}Mehrdeutige Ziffern-Cluster: {ambiguous}")

    return seen


def learn_letters(rows, columns, digits):
    """In der Wochentabelle kommen nur RT, CT und RES als Buchstaben vor."""
    three, two = collections.Counter(), collections.Counter()
    for row in rows:
        for cell in cells(row, columns)[1:]:
            keys = [g[1] for g in cell]
            if not keys or all(k in digits for k in keys):
                continue
            if len(keys) == 3:
                three[tuple(keys)] += 1
            elif len(keys) == 2:
                two[tuple(keys)] += 1

    if not three:
        raise SystemExit("Kein RES-Token gefunden, Buchstaben nicht lernbar")

    res = three.most_common(1)[0][0]
    letters = {res[0]: "R", res[1]: "E", res[2]: "S"}
    for keys, _ in two.most_common():
        if keys[0] == res[0]:
            letters.setdefault(keys[1], "T")
    for keys, _ in two.most_common():
        if keys[0] not in letters:
            letters[keys[0]] = "C"
    return letters


def extract_group(page):
    items = glyphs(page)

    nr_rows = numbered_column_rows(items, nr_column(page))
    zyklus = len(nr_rows)
    seen = learn_digits(
        [[g[1] for g in sorted(r, key=lambda g: g[0].x0)] for r in nr_rows],
        label="Nr-Spalte: ",
    )

    columns = right_block_columns(page)
    all_rows = [r for r in group_rows(items, columns[0], columns[-1]) if r[0][0].y0 > DATA_TOP]
    # Ueber den Datenzeilen stehen noch Kopf- und Summenzeilen; die Daten sind
    # die letzten N Zeilen und tragen in Spalte 0 die Wochennummern 1..N.
    rows = all_rows[-zyklus:]
    if len(rows) != zyklus:
        raise SystemExit(f"Rechter Block: {len(rows)} Zeilen, erwartet {zyklus}")

    seen = learn_digits(
        [[g[1] for g in cells(r, columns)[0]] for r in rows],
        seen=seen,
        label="Woche-Spalte: ",
    )
    digits = {k: next(iter(v)) for k, v in seen.items()}
    chars = {**digits, **learn_letters(rows, columns, digits)}

    def render(cell):
        return "".join(chars.get(g[1], "?") for g in cell)

    wochen = {}
    for row in rows:
        parts = [render(cell) for cell in cells(row, columns)]
        woche, tage = parts[0], parts[1:]
        if not woche.isdigit():
            continue
        if any(entry == "" or "?" in entry for entry in tage):
            raise SystemExit(f"Woche {woche}: unlesbare Eintraege {tage}")
        wochen[int(woche)] = tage

    missing = [n for n in range(1, zyklus + 1) if n not in wochen]
    if missing:
        raise SystemExit(f"Fehlende Wochen: {missing}")

    return zyklus, [wochen[n] for n in range(1, zyklus + 1)]


def dump(plan):
    """JSON mit einer Woche pro Zeile -- so bleibt der Diff lesbar."""
    gruppen = []
    for gruppe in plan["gruppen"]:
        wochen = ",\n".join(
            "        " + json.dumps(woche, ensure_ascii=False) for woche in gruppe["wochen"]
        )
        head = {k: v for k, v in gruppe.items() if k != "wochen"}
        fields = ",\n".join(
            f"      {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)}"
            for k, v in head.items()
        )
        gruppen.append(f'    {{\n{fields},\n      "wochen": [\n{wochen}\n      ]\n    }}')

    head = {k: v for k, v in plan.items() if k != "gruppen"}
    fields = ",\n".join(
        f"  {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)}"
        for k, v in head.items()
    )
    body = ",\n".join(gruppen)
    return f'{{\n{fields},\n  "gruppen": [\n{body}\n  ]\n}}\n'


def main():
    if len(sys.argv) != 4:
        sys.exit(__doc__)

    pdf_path, out_path, depot = sys.argv[1], sys.argv[2], sys.argv[3]
    document = pymupdf.open(pdf_path)

    gruppen = []
    for page_index, header in DEPOTS[depot][PagesConst].items():
        zyklus, wochen = extract_group(document[page_index])
        gruppen.append({**header, "zyklusLaenge": zyklus, "wochen": wochen})

        # Selbstpruefung: die Kopfzeile jeder Seite nennt "Touren" und
        # "Freie Tage". Stimmen beide Summen, ist das Raster vollstaendig
        # richtig gelesen -- ein stiller Extraktionsfehler wuerde hier auffallen.
        eintraege = [entry for woche in wochen for entry in woche]
        touren = sum(1 for e in eintraege if e.isdigit() or e == "RES")
        frei = sum(1 for e in eintraege if e in ("RT", "CT"))
        print(
            f"  {header['gruppe']}: {zyklus} Wochen, {len(eintraege)} Eintraege"
            f" -- Touren: {touren}, Freie Tage: {frei}"
            f"  (mit der Kopfzeile der PDF-Seite vergleichen)"
        )

    plan = {**DEPOTS[depot][PlanConst], "gruppen": gruppen}
    with open(out_path, "w", encoding="utf-8") as handle:
        handle.write(dump(plan))

    print(f"Geschrieben: {out_path}")


if __name__ == "__main__":
    main()

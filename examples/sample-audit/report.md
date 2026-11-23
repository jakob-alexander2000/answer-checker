# Antwort-Audit: Arbeitsrecht-Fragen, Beispielbericht

Auftraggeber: Beispiel (kein Kunde) · System: Demo-Log aus dem Testsatz de-arbeitsrecht · Datum: 2026-11-23 · Prüfwerkzeug: answer-checker 0.2.0

## Ergebnis

| | |
| --- | --- |
| Antworten geprüft | 70 |
| ohne Befund | 46 |
| vom Werkzeug markiert | 24 (Hoch 20, Mittel 4) |
| bestätigt | 13 |
| verworfen (Fehlalarm) | 11 |
| noch nicht geprüft | 0 |
| in der Stichprobe gefunden | 0 |

Von 24 geprüften Markierungen waren 54% echte Probleme.

## Was zu ändern ist

1. **Zahlen, Fristen und Grenzen** (Hoch). Zahlen und ihre Grenzwörter („mindestens“, „bis zu“, „spätestens“) wörtlich aus der Quelle übernehmen lassen. Wo das System rechnet oder rundet, die Zahl der Quelle mit angeben. 9 Antworten: arbzg-03, burlg-08, entgfg-06, kschg-02, kschg-03, muschg-04, nachwg-01, tzbfg-02, tzbfg-10
2. **Weggelassene Bedingungen und Ausnahmen** (Hoch). Regeln nur zusammen mit ihrer Bedingung ausgeben („es sei denn“, „soweit“, „wenn“). Wenn Antworten kurz sein sollen, lieber auf die Quelle verweisen als die Bedingung streichen. 3 Antworten: burlg-10, tzbfg-04, tzbfg-06
3. **Antworten, die der Quelle widersprechen** (Hoch). Die Antwort sagt das Gegenteil der Quelle. Verneinungen wie „nicht“, „kein“ oder „unzulässig“ gehen beim Umformulieren verloren. Im System-Prompt verlangen, dass Ge- und Verbote im Wortlaut der Quelle wiedergegeben werden, und diese Fragen nach der Änderung erneut prüfen. 1 Antwort: entgfg-10

## Befunde

### f-001 · arbzg-03 · Hoch · Grenze oder Zahl · bestätigt

- Frage: Wie lange muss meine Pause bei einem Acht-Stunden-Tag sein?
- Antwort: Die Arbeit ist durch Ruhepausen von **15 Minuten** zu unterbrechen.
- Quelle: Die Arbeit ist durch im voraus feststehende Ruhepausen von **mindestens 30 Minuten** bei einer Arbeitszeit von **mehr als sechs** **bis zu neun Stunden** und **45 Minuten** bei einer Arbeitszeit von **mehr als neun Stunden** insgesamt zu unterbrechen.
- Prüfwerkzeug: Die Antwort lässt „mindestens 30 Minuten“, „mehr als sechs“, „bis zu neun Stunden“, „45 Minuten“, „mehr als neun Stunden“ weg.
- Prüfwerkzeug: Die Antwort nennt „15 Minuten“, das in keiner Quelle steht.
- Prüfung: Eine Zahl, Frist oder Grenze weicht von der Quelle ab.

### f-002 · arbzg-10 · Hoch · Ohne Quelle, Grenze oder Zahl · verworfen

- Frage: Darf ich sonntags beschäftigt werden?
- Antwort: **Grundsätzlich nein, an Sonn- und Feiertagen ist Beschäftigung den ganzen Tag über verboten.**
- Quelle: Arbeitnehmer dürfen an Sonn- und gesetzlichen Feiertagen von **0** bis **24 Uhr** nicht beschäftigt werden.
- Prüfwerkzeug: Ein Satz steht in keiner abgerufenen Passage.
- Prüfwerkzeug: Die Antwort lässt „0“, „24 Uhr“ weg.
- Prüfung: Fehlalarm: Die Antwort gibt die Quelle richtig wieder (umformuliert).

### f-003 · burlg-08 · Hoch · Grenze oder Zahl · bestätigt

- Frage: Bis wann muss übertragener Urlaub genommen werden?
- Antwort: Im Fall der Übertragung muss der Urlaub im folgenden Kalenderjahr genommen werden.
- Quelle: Im Fall der Übertragung muß der Urlaub in den ersten **drei Monaten** des folgenden Kalenderjahrs gewährt und genommen werden.
- Prüfwerkzeug: Die Antwort lässt „drei Monaten“ weg.
- Prüfung: Eine Zahl, Frist oder Grenze weicht von der Quelle ab.

### f-004 · burlg-10 · Hoch · Bedingung fehlt · bestätigt

- Frage: Bekomme ich Urlaub, wenn mein alter Arbeitgeber mir dieses Jahr schon Urlaub gegeben hat?
- Antwort: Der Anspruch auf Urlaub besteht für jedes Arbeitsverhältnis neu, egal was ein früherer Arbeitgeber gewährt hat.
- Quelle: Der Anspruch auf Urlaub besteht nicht, **soweit dem Arbeitnehmer für das laufende Kalenderjahr bereits von einem früheren Arbeitgeber Urlaub gewährt worden ist**.
- Prüfwerkzeug: Die Antwort lässt „soweit dem Arbeitnehmer für das laufende Kalenderjahr bereits von einem früheren Arbeitgeber Urlaub gewährt worden ist“ weg.
- Prüfung: Die Aussage steht so nicht in der Quelle.

### f-005 · entgfg-06 · Hoch · Grenze oder Zahl · bestätigt

- Frage: Wann muss ich meinem Arbeitgeber meine Krankmeldung mitteilen?
- Antwort: Sie sind verpflichtet, dem Arbeitgeber die Arbeitsunfähigkeit innerhalb **einer Woche** mitzuteilen.
- Quelle: Der Arbeitnehmer ist verpflichtet, dem Arbeitgeber die Arbeitsunfähigkeit und deren voraussichtliche Dauer unverzüglich mitzuteilen.
- Prüfwerkzeug: Die Antwort nennt „einer Woche“, das in keiner Quelle steht.
- Prüfung: Die Aussage steht so nicht in der Quelle.

### f-006 · entgfg-10 · Hoch · Widerspricht der Quelle · bestätigt

- Frage: Zählen Überstunden bei der Lohnfortzahlung mit?
- Antwort: **Zum fortgezahlten Arbeitsentgelt gehört auch das zusätzlich für Überstunden gezahlte Arbeitsentgelt.**
- Quelle: Zum Arbeitsentgelt nach Absatz 1 gehören nicht das zusätzlich für Überstunden gezahlte Arbeitsentgelt und Leistungen für Aufwendungen des Arbeitnehmers
- Prüfwerkzeug: Ein Satz sagt das Gegenteil der Quelle.
- Prüfung: Die Aussage steht so nicht in der Quelle.

### f-007 · kschg-02 · Hoch · Grenze oder Zahl · bestätigt

- Frage: Gilt das Kündigungsschutzgesetz auch in sehr kleinen Betrieben?
- Antwort: Die Vorschriften des Kündigungsschutzgesetzes gelten für alle Betriebe und Verwaltungen, unabhängig von der Zahl der Arbeitnehmer.
- Quelle: Die Vorschriften des **Ersten Abschnitts** gelten mit Ausnahme der §§ 4 bis **7** und des § 13 Abs. 1 Satz 1 und 2 nicht für Betriebe und Verwaltungen, in denen in der Regel fünf oder weniger Arbeitnehmer ausschließlich der zu ihrer Berufsbildung Beschäftigten beschäftigt werden.
- Prüfwerkzeug: Die Antwort lässt „Ersten Abschnitts“, „7“ weg.
- Prüfung: Die Aussage steht so nicht in der Quelle.

### f-008 · kschg-03 · Hoch · Grenze oder Zahl · bestätigt

- Frage: Wie lange habe ich Zeit, gegen eine Kündigung zu klagen?
- Antwort: Sie müssen innerhalb von **vier Wochen** nach Zugang der schriftlichen Kündigung Klage beim Arbeitsgericht erheben.
- Quelle: Will ein Arbeitnehmer geltend machen, dass eine Kündigung sozial ungerechtfertigt oder aus anderen Gründen rechtsunwirksam ist, so muss er innerhalb von **drei Wochen** nach Zugang der schriftlichen Kündigung Klage beim Arbeitsgericht auf Feststellung erheben, dass das Arbeitsverhältnis durch die Kündigung nicht aufgelöst ist.
- Prüfwerkzeug: Die Antwort lässt „drei Wochen“ weg.
- Prüfwerkzeug: Die Antwort nennt „vier Wochen“, das in keiner Quelle steht.
- Prüfung: Eine Zahl, Frist oder Grenze weicht von der Quelle ab.

### f-009 · kschg-05 · Hoch · Grenze oder Zahl · verworfen

- Frage: Bekomme ich bei einer betriebsbedingten Kündigung eine Abfindung?
- Antwort: Kündigt der Arbeitgeber wegen dringender betrieblicher Erfordernisse und erheben Sie bis zum Ablauf der Klagefrist keine Klage, haben Sie mit dem Ablauf der Kündigungsfrist Anspruch auf eine Abfindung.
- Quelle: Kündigt der Arbeitgeber wegen dringender betrieblicher Erfordernisse nach § 1 Abs. **2 Satz** 1 und erhebt der Arbeitnehmer bis zum Ablauf der Frist des § 4 Satz 1 keine Klage auf Feststellung, dass das Arbeitsverhältnis durch die Kündigung nicht aufgelöst ist, hat der Arbeitnehmer mit dem Ablauf der Kündigungsfrist Anspruch auf eine Abfindung.
- Prüfwerkzeug: Die Antwort lässt „2 Satz“ weg.
- Prüfung: Fehlalarm: Die Antwort gibt die Quelle richtig wieder (wörtlich).

### f-010 · kschg-09 · Hoch · Widerspricht der Quelle · verworfen

- Frage: Kann einem Betriebsratsmitglied gekündigt werden?
- Antwort: **Die Kündigung eines Betriebsratsmitglieds ist unzulässig, es sei denn, daß Tatsachen vorliegen, die zur Kündigung aus wichtigem Grund ohne Einhaltung einer Kündigungsfrist berechtigen, und die erforderliche Zustimmung vorliegt oder durch gerichtliche Entscheidung ersetzt ist.**
- Quelle: Die Kündigung eines Mitglieds eines Betriebsrats, einer Jugend- und Auszubildendenvertretung, einer Bordvertretung oder eines Seebetriebsrats ist unzulässig, es sei denn, daß Tatsachen vorliegen, die den Arbeitgeber zur Kündigung aus wichtigem Grund ohne Einhaltung einer Kündigungsfrist berechtigen, und daß die nach § 103 des Betriebsverfassungsgesetzes erforderliche Zustimmung vorliegt oder durch gerichtliche Entscheidung ersetzt ist.
- Prüfwerkzeug: Ein Satz sagt das Gegenteil der Quelle.
- Prüfung: Fehlalarm: Die Antwort gibt die Quelle richtig wieder (wörtlich).

### f-011 · kschg-10 · Hoch · Grenze oder Zahl · verworfen

- Frage: Gilt der Kündigungsschutz im öffentlichen Dienst?
- Antwort: Ja, die Regeln gelten für private wie für öffentliche Betriebe und Verwaltungen.
- Quelle: Die Vorschriften des Ersten und **Zweiten Abschnitts** gelten für Betriebe und Verwaltungen des privaten und des öffentlichen Rechts, vorbehaltlich der Vorschriften des § 24 für die Seeschiffahrts-, Binnenschiffahrts- und Luftverkehrsbetriebe.
- Prüfwerkzeug: Die Antwort lässt „Zweiten Abschnitts“ weg.
- Prüfung: Fehlalarm: Die Antwort gibt die Quelle richtig wieder (umformuliert).

### f-012 · muschg-04 · Hoch · Grenze oder Zahl · bestätigt

- Frage: Wann verlängert sich die Schutzfrist nach der Geburt?
- Antwort: Die Schutzfrist nach der Entbindung verlängert sich auf **zehn Wochen**.
- Quelle: Die Schutzfrist nach der Entbindung verlängert sich auf **zwölf Wochen**
- Prüfwerkzeug: Die Antwort lässt „zwölf Wochen“ weg.
- Prüfwerkzeug: Die Antwort nennt „zehn Wochen“, das in keiner Quelle steht.
- Prüfung: Eine Zahl, Frist oder Grenze weicht von der Quelle ab.

### f-013 · nachwg-01 · Hoch · Grenze oder Zahl · bestätigt

- Frage: Bis wann muss ich meine Arbeitsbedingungen schriftlich bekommen?
- Antwort: Der Arbeitgeber hat **spätestens drei Monate** nach dem vereinbarten Beginn des Arbeitsverhältnisses die wesentlichen Vertragsbedingungen schriftlich niederzulegen.
- Quelle: Der Arbeitgeber hat **spätestens einen Monat** nach dem vereinbarten Beginn des Arbeitsverhältnisses die wesentlichen Vertragsbedingungen schriftlich niederzulegen, die Niederschrift zu unterzeichnen und dem Arbeitnehmer auszuhändigen.
- Prüfwerkzeug: Die Antwort lässt „spätestens einen Monat“ weg.
- Prüfwerkzeug: Die Antwort nennt „spätestens drei Monate“, das in keiner Quelle steht.
- Prüfung: Eine Zahl, Frist oder Grenze weicht von der Quelle ab.

### f-014 · nachwg-04 · Hoch · Grenze oder Zahl · verworfen

- Frage: Wie schnell muss eine Änderung meiner Vertragsbedingungen mitgeteilt werden?
- Antwort: Ändert sich etwas Wesentliches, muss man es Ihnen innerhalb eines Monats schriftlich mitteilen.
- Quelle: Eine Änderung der wesentlichen Vertragsbedingungen ist dem Arbeitnehmer **spätestens einen Monat** nach der Änderung schriftlich mitzuteilen.
- Prüfwerkzeug: Die Antwort lässt „spätestens einen Monat“ weg.
- Prüfung: Fehlalarm: Die Antwort gibt die Quelle richtig wieder (umformuliert).

### f-015 · nachwg-05 · Hoch · Grenze oder Zahl · verworfen

- Frage: Brauche ich einen extra Nachweis, wenn ich schon einen schriftlichen Arbeitsvertrag habe?
- Antwort: Wenn Ihnen ein schriftlicher Arbeitsvertrag ausgehändigt worden ist, entfällt die Verpflichtung, soweit der Vertrag die geforderten Angaben enthält.
- Quelle: Wenn dem Arbeitnehmer ein schriftlicher Arbeitsvertrag ausgehändigt worden ist, entfällt die Verpflichtung nach den Absätzen **1** und **2**, soweit der Vertrag die in den Absätzen **1** bis **3 geforderten Angaben** enthält.
- Prüfwerkzeug: Die Antwort lässt „1“, „2“, „1“, „3 geforderten Angaben“ weg.
- Prüfung: Fehlalarm: Die Antwort gibt die Quelle richtig wieder (wörtlich).

### f-016 · nachwg-06 · Hoch · Bedingung fehlt · verworfen

- Frage: Wann muss ich die Niederschrift bei einem Auslandseinsatz bekommen?
- Antwort: Wenn Sie länger als einen Monat außerhalb Deutschlands arbeiten, muss Ihnen die Niederschrift vor Ihrer Abreise ausgehändigt werden.
- Quelle: **Hat der Arbeitnehmer seine Arbeitsleistung länger als einen Monat außerhalb der Bundesrepublik Deutschland zu erbringen**, so muß die Niederschrift dem Arbeitnehmer vor seiner Abreise ausgehändigt werden
- Prüfwerkzeug: Die Antwort lässt „Hat der Arbeitnehmer seine Arbeitsleistung länger als einen Monat außerhalb der Bundesrepublik Deutschland zu erbringen“ weg.
- Prüfung: Fehlalarm: Die Antwort gibt die Quelle richtig wieder (wörtlich).

### f-017 · tzbfg-02 · Hoch · Grenze oder Zahl · bestätigt

- Frage: Gilt der Teilzeitanspruch auch in kleinen Firmen?
- Antwort: Der Anspruch auf Verringerung der Arbeitszeit gilt unabhängig von der Größe des Arbeitgebers.
- Quelle: Für den Anspruch auf Verringerung der Arbeitszeit gilt die Voraussetzung, dass der Arbeitgeber, unabhängig von der Anzahl der Personen in Berufsbildung, in der Regel **mehr als 15 Arbeitnehmer** beschäftigt.
- Prüfwerkzeug: Die Antwort lässt „mehr als 15 Arbeitnehmer“ weg.
- Prüfung: Die Aussage steht so nicht in der Quelle.

### f-018 · tzbfg-04 · Hoch · Bedingung fehlt · bestätigt

- Frage: Muss mein Arbeitgeber der Teilzeit zustimmen?
- Antwort: Der Arbeitgeber hat der Verringerung der Arbeitszeit zuzustimmen und ihre Verteilung entsprechend Ihren Wünschen festzulegen.
- Quelle: Der Arbeitgeber hat der Verringerung der Arbeitszeit zuzustimmen und ihre Verteilung entsprechend den Wünschen des Arbeitnehmers festzulegen, **soweit betriebliche Gründe nicht entgegenstehen**.
- Prüfwerkzeug: Die Antwort lässt „soweit betriebliche Gründe nicht entgegenstehen“ weg.
- Prüfung: Eine Bedingung oder Ausnahme der Quelle fehlt.

### f-019 · tzbfg-06 · Hoch · Bedingung fehlt · bestätigt

- Frage: Dürfen Teilzeitkräfte schlechter behandelt werden?
- Antwort: Ein teilzeitbeschäftigter Arbeitnehmer darf wegen der Teilzeitarbeit nicht schlechter behandelt werden als ein vergleichbarer vollzeitbeschäftigter Arbeitnehmer.
- Quelle: Ein teilzeitbeschäftigter Arbeitnehmer darf wegen der Teilzeitarbeit nicht schlechter behandelt werden als ein vergleichbarer vollzeitbeschäftigter Arbeitnehmer, **es sei denn, dass sachliche Gründe eine unterschiedliche Behandlung rechtfertigen**.
- Prüfwerkzeug: Die Antwort lässt „es sei denn, dass sachliche Gründe eine unterschiedliche Behandlung rechtfertigen“ weg.
- Prüfung: Eine Bedingung oder Ausnahme der Quelle fehlt.

### f-020 · tzbfg-10 · Hoch · Grenze oder Zahl · bestätigt

- Frage: Wie lange habe ich Zeit, gegen eine unwirksame Befristung zu klagen?
- Antwort: Sie müssen innerhalb von **drei Monaten** nach dem vereinbarten Ende des befristeten Arbeitsvertrages Klage beim Arbeitsgericht erheben.
- Quelle: Will der Arbeitnehmer geltend machen, dass die Befristung eines Arbeitsvertrages rechtsunwirksam ist, so muss er innerhalb von **drei Wochen** nach dem vereinbarten Ende des befristeten Arbeitsvertrages Klage beim Arbeitsgericht auf Feststellung erheben, dass das Arbeitsverhältnis auf Grund der Befristung nicht beendet ist.
- Prüfwerkzeug: Die Antwort lässt „drei Wochen“ weg.
- Prüfwerkzeug: Die Antwort nennt „drei Monaten“, das in keiner Quelle steht.
- Prüfung: Eine Zahl, Frist oder Grenze weicht von der Quelle ab.

### f-021 · entgfg-04 · Mittel · Ohne Quelle · verworfen

- Frage: Was gilt, wenn ich wegen derselben Krankheit wieder arbeitsunfähig werde?
- Antwort: **Bei erneuter Arbeitsunfähigkeit wegen derselben Krankheit können Sie unter bestimmten Fristen noch einmal bis zu sechs Wochen Lohnfortzahlung bekommen.**
- Quelle: Wird der Arbeitnehmer infolge derselben Krankheit erneut arbeitsunfähig, so verliert er wegen der erneuten Arbeitsunfähigkeit den Anspruch nach Satz 1 für einen weiteren Zeitraum von höchstens sechs Wochen nicht, wenn
- Prüfwerkzeug: Ein Satz steht in keiner abgerufenen Passage.
- Prüfung: Fehlalarm: Die Antwort gibt die Quelle richtig wieder (umformuliert).

### f-022 · entgfg-09 · Mittel · Ohne Quelle · verworfen

- Frage: Wie hoch ist die Entgeltfortzahlung?
- Antwort: **Sie bekommen das Gehalt weiter, das Ihnen für Ihre normale regelmäßige Arbeitszeit zusteht.**
- Quelle: Für den in § 3 Abs. 1 oder in § 3a Absatz 1 bezeichneten Zeitraum ist dem Arbeitnehmer das ihm bei der für ihn maßgebenden regelmäßigen Arbeitszeit zustehende Arbeitsentgelt fortzuzahlen.
- Prüfwerkzeug: Ein Satz steht in keiner abgerufenen Passage.
- Prüfung: Fehlalarm: Die Antwort gibt die Quelle richtig wieder (umformuliert).

### f-023 · muschg-06 · Mittel · Ohne Quelle · verworfen

- Frage: Darf ich als Schwangere sonntags arbeiten?
- Antwort: Grundsätzlich nicht. **Ausnahmen gibt es nur unter bestimmten Voraussetzungen, zum Beispiel wenn Sie ausdrücklich zustimmen.**
- Quelle: Der Arbeitgeber darf eine schwangere oder stillende Frau nicht an Sonn- und Feiertagen beschäftigen. Er darf sie an Sonn- und Feiertagen nur dann beschäftigen, wenn
- Prüfwerkzeug: Ein Satz steht in keiner abgerufenen Passage.
- Prüfung: Fehlalarm: Die Antwort gibt die Quelle richtig wieder (umformuliert).

### f-024 · tzbfg-09 · Mittel · Ohne Quelle · verworfen

- Frage: Darf mein früherer Arbeitgeber mich ohne Grund befristet einstellen?
- Antwort: **Nein, eine sachgrundlose Befristung scheidet aus, wenn Sie schon einmal bei demselben Arbeitgeber angestellt waren.**
- Quelle: Eine Befristung nach Satz 1 ist nicht zulässig, wenn mit demselben Arbeitgeber bereits zuvor ein befristetes oder unbefristetes Arbeitsverhältnis bestanden hat.
- Prüfwerkzeug: Ein Satz steht in keiner abgerufenen Passage.
- Prüfung: Fehlalarm: Die Antwort gibt die Quelle richtig wieder (umformuliert).

## Methode

Jede Antwort wurde mit answer-checker 0.2.0 gegen die Passagen geprüft, aus denen das System geantwortet hat. Das Werkzeug läuft ohne Sprachmodell und ohne Netz, das Ergebnis ist bei gleicher Eingabe immer gleich.

Vier Prüfungen: Steht jeder Satz in einer Quelle (und sagt er nicht das Gegenteil)? Bleibt der Geltungsbereich gleich? Sind Zahlen, Fristen und Grenzen erhalten? Fehlt keine Bedingung oder Ausnahme?

Jeder markierte Befund wurde danach von einem Menschen gelesen und bestätigt oder als Fehlalarm verworfen. Nur bestätigte und offene Befunde gehen in die Liste der Änderungen ein.

Auf dem öffentlichen Testsatz „de-arbeitsrecht“ (26 zurückgehaltene Fragen) erkennt das Werkzeug 23 von 26 falschen Antworten. Eine Markierung ist dort in 52% der Fälle richtig. Deshalb wird jeder Befund von einem Menschen geprüft. https://github.com/jakob-alexander2000/answer-checker/tree/main/bench/de-arbeitsrecht

## Grenzen

- Geprüft wird, ob die Antwort zu ihren Quellen passt. Ob die Quellen selbst richtig, aktuell oder die besten sind, wird nicht geprüft.
- Das Werkzeug vergleicht normalisierte Wörter, nicht Bedeutung. Eine falsche Antwort, die nur ein Verb austauscht, kann unbemerkt bleiben. Die Stichprobe fängt einen Teil davon auf, nicht alles.
- Dieser Bericht ist keine Rechtsberatung.

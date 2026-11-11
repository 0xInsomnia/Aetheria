# Aetheria — Registro di avanzamento

## Alpha 0.2 (11 novembre 2026)

Commit principale: `38282e38aa6425dd3654a052378f41c65fc5eba3`. Correzione percorso sfondo: `6ca2a1aff90ac1ce42d9c4e6107194df3fd8f7f6`.

### Implementato

- Inquadrature selezionabili: **figura intera**, **scena**, **dettaglio**. Il ritaglio e lo zoom sono transizioni dell'illustrazione completa, non pose articolate.
- Livelli visuali indipendenti: sfondo sfocato, immagine concept, overlay di luce, particelle animate e feedback al tocco.
- Intensità luce regolabile 0–100%, interruttore particelle, preferenze salvate in `localStorage`.
- Mantenuti dialogo simulato, effetti di stato, colori indipendenti UI/ambiente, sintesi vocale browser quando disponibile.
- Respect del sistema `prefers-reduced-motion` per disabilitare le animazioni decorative.

### Test eseguiti

- `node --check` sul nuovo script: superato.
- Chromium headless, con HTML/CSS/JS e asset incorporati nel test (ambiente blocca le richieste HTTP locali), viewport 390×844 e 1280×900.
- Passati per entrambe le viewport: scelta modalità dettaglio e figura intera, regolazione luce a 80%, disattivazione particelle, cambio luce rossa, invio messaggio 'ciao' e verifica cronologia; nessun errore JavaScript rilevato.
- Screenshot locali prodotti per entrambi i viewport. GitHub Pages su telefono fisico **non verificato da questi test**.

### Da fare — priorità alta

1. Nuovo master art coerente con le reference: **orecchie umane**, figura adulta, viso semi-realistico; revisione artistica prima dell'integrazione.
2. Asset del personaggio a livelli indipendenti (capelli, viso, occhi, braccia, busto, gambe, outfit e dettagli), con porzioni nascoste disegnate.
3. Rig scheletrico 2D funzionante con pivot e test per idle, occhi e saluto. Questa è la vera soglia tra una demo con immagine e una companion animata.
4. Espressioni/lip sync e pose dedicate per seduta e camminata.
5. Maschere di colore per outfit indipendenti da UI e stanza, preset street black/red.
6. AI e memoria personale solo con backend e protezione adeguata delle credenziali.

### Confini e privacy

Solo `0xInsomnia/Aetheria`; **Neliel 3D non viene toccata**. Il repository è pubblico: reference originali e dettagli personali non vanno pubblicati. L'illustrazione inserita è un concept provvisorio.

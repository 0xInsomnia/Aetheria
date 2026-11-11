# Aetheria — Registro progressi

## Alpha 0.3 — 11 novembre 2026

### Implementato e pubblicato

- Scheda **Stanza** con planimetria schematica e cinque zone cliccabili: finestra, scrivania, lampada, divano, letto.
- Selezione zona con descrizione accessibile e messaggio contestuale nella scena.
- Controllo lampada con effetto luce indipendente, modalità atmosfera **Notte viola / Luce calda**, pulsante **Inquadra la scena**.
- Persistenza preferenze stanza mediante `localStorage` sotto la chiave `aetheria.room-v03`.
- Conservate: chat dimostrativa, transizioni immagine, tre inquadrature, overlay particelle, luce regolabile e palette UI.
- Creato `src/skeleton2d.mjs`: motore di trasformazioni 2D per futuri livelli separati (poses, interpolazione, keyframes). Per ora è codice **non collegato** alla UI.

### Verifiche eseguite

- `node --check` per i tre blocchi JavaScript dell'HTML: OK.
- Chromium headless con asset incorporati per il test, viewport **390 × 844** e **1280 × 900**: scheda stanza e cinque hotspot visibili; selezioni, lampada, luce calda, inquadratura e chat funzionanti; **nessun errore JavaScript**.
- `node --test` sul motore locale equivalente: quattro test superati; presenti test pubblicati in `tests/skeleton2d.test.mjs`. Da eseguire tramite checkout remoto per validazione del commit pubblicato.
- Non ancora testato su Android fisico né valutata la coerenza artistica di un vero personaggio a più livelli.

### Problemi aperti

1. L'illustrazione attuale è **unica**: lo sfondo non è separato dal personaggio.
2. La **mappa stanza** è uno schematico: oggetti e movimento reale devono ancora essere creati in arte coerente.
3. L'attuale concept non è ancora conforme alla scelta definitiva delle **orecchie umane**.
4. Mancano asset del personaggio distinti: volto, occhi, capelli, busto, braccia, gambe, outfit e aree nascoste.
5. Mancano animazioni articolate, camminata, seduta, posa relax reale, labiale, cambio outfit e AI/voce in ingresso.

### Prossima priorità

Costruire un **master art** semi-realistico adulto e una prima sprite sheet a livelli, verificandone coerenza, proporzioni, pivot e capacità di deformazione. Collegare successivamente il nuovo motore `skeleton2d.mjs` alle parti reali del personaggio. Un mockup statico non sarà considerato prova di animazione articolata.

### Confini

Modifiche esclusivamente in `0xInsomnia/Aetheria`: non toccare `0xInsomnia/Neliel`. Repository pubblico; nessuna reference privata committata.


## Alpha 0.4 — stanza visibile (11 novembre 2026)

La scheda **Stanza** ora apre una **illustrazione completa dell'ambiente arredato** nello stage principale, non soltanto una mappa astratta. L'immagine si trova in `assets/aetheria-room-v04.webp`.

- Letto, lampada, scrivania e finestra hanno pulsanti sovrapposti e collegati alle zone esistenti.
- La vista della stanza diventa visibile per impostazione predefinita e puoi cambiare scheda per tornare al personaggio precedente.
- Un pulsante **Apri la panoramica della stanza** mostra l'illustrazione intera in un dialogo.
- Luci e atmosfera restano controllabili indipendentemente dai colori della UI.
- **Limite:** il personaggio è ancora parte di una singola illustrazione; non cammina nella stanza e gli arredi non sono oggetti tridimensionali.
- Il nuovo sfondo è un asset generato per il progetto. Le reference originali private non sono state pubblicate.

Lo script e la stanza vengono aggiornati direttamente su `main`, senza modifiche al repository `Neliel`.

Verifiche: test locali Chromium su layout mobile e desktop per visibilità stanza, click scrivania e interruttore luce; codice finale pubblicato con gli stessi componenti, ma browser reale su GitHub Pages e prestazioni del telefono non verificati.

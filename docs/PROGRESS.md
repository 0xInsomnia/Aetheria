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


## Alpha 0.5 — scena ambiente indipendente (11 novembre 2026)

**Implementato e pubblicato:** nuovo asset `assets/aetheria-room-empty-v05.svg`, un panorama illustrato originale che mostra letto, scrivania, monitor, finestra notturna, divano, libreria e luci **senza il personaggio incorporato**. Aprendo la scheda `Stanza`, l'app nasconde la precedente illustrazione con Aetheria e usa il nuovo panorama. Tornando alla scheda `Dialogo`, resta disponibile la scena Companion preesistente. Controlli e hotspot di stanza preservati.

Commit asset: `e0bb8f1fc9cb732379ebbf26037a020eb8e5c5da`. Commit interfaccia: `25df73237882edf34f6aa5b1deb7dbeeb0b6ab0e`.

**Verificato:** asset SVG e indice leggibili dal repository; l'HTML non contiene più riferimenti al precedente asset `aetheria-room-v04.webp`; il job GitHub Pages del commit 0.5 è terminato con esito `success`.

**Limiti:** si tratta di un'illustrazione vettoriale tecnica della stanza, non ancora di una stanza semi-realistica definitiva. La figura non è visibile nella vista vuota e non esiste ancora come sprite separato con rig; nessun movimento o interazione fisica reale. Render su dispositivo Android non verificato in questo turno. Il prossimo step è sostituire il panorama tecnico con fondale artistico coerente e costruire il personaggio a livelli indipendenti.


## Alpha 0.6 — prototipo personaggio sovrapposto (11 novembre 2026)

Creato il file originale generato e isolato **\`assets/aetheria-character-concept-v06.webp\`** (trasparenza), e aggiunti **\`src/room-avatar-preview.css\`** e **\`src/room-avatar-preview.mjs\`**. Nella scheda Stanza, l'avatar può apparire come livello separato dal fondale e viene posizionato in quattro zone (centro, letto, scrivania, divano); è possibile mostrarlo o nasconderlo e la preferenza viene conservata localmente. La scena Dialogo continua a usare il concept storico.

**Nessuna animazione articolata:** la figura è un unico ritaglio raster, lo spostamento è una traslazione e le piccole oscillazioni sono effetti sul frame completo. Il ritaglio ha difetti visivi e la figura non è ancora fedele al master approvato (in particolare orecchie umane). È uno *stand-in tecnico* da sostituire, non un modello finale. Sono stati verificati caricamento immagine, posizionamento, hide/show e assenza di errori JS in fixture Chromium 1280×900 e 390×844. Il deploy Pages e il dispositivo Android fisico richiedono verifica separata. Vedi docs/CHARACTER_PREVIEW_V06.md.

## Alpha 0.7 — integrazione della pipeline del collega (12 novembre 2026)

- Esaminata e integrata la Pull Request [#1](https://github.com/0xInsomnia/Aetheria/pull/1), con commit merge `fc0eee1442d6c732af3c0751be87e8460577a3e9`. Contiene la pipeline indipendente nella cartella `character/`.
- Aggiunto in **Azioni** un collegamento al [laboratorio delle animazioni](https://0xinsomnia.github.io/Aetheria/character/demo/), senza sostituire lo sprite statico della stanza.
- Aggiornata l'etichetta dell'app a `ALPHA 0.7`; la versione del modulo avatar rimane v0.6.
- Aggiunto workflow GitHub Actions `.github/workflows/checks.yml`: `node --test tests/*.test.mjs character/tests/*.test.mjs`, validatore delle giunzioni e controlli sintassi dei moduli. Prima esecuzione GitHub Actions **success** (run 43167181290).
- **Limite da non nascondere:** il rig usa 56 sprite segnaposto schematici. Nessun livello semi-realistico dipinto è ancora stato importato, nessuna camminata reale, nessuna posa seduta. L'immagine provvisoria presente nella stanza resta un elemento separato, non riggato.
- Prossima priorità: realizzazione dell'artwork master con orecchie umane e separazione vera dei livelli (volto, capelli, busto, arti, vestiti), importazione nel rig e verifica della resa mobile. Non confondere la demo tecnica con la qualità finale desiderata.

## Alpha 0.8 — collegamento effettivo del rig nella stanza (12 novembre 2026)

- La vista stanza ospita ora il rig tecnico tramite \`src/room-rig-overlay.mjs\`; selezione esplicita **Illustrata / Rig animato · demo**.
- Demo live: 28 ossa, 56 PNG segnaposto, animazioni di respirazione/capelli, saluto, blink, quattro espressioni e tre palette, usando gli stessi file \`character/\` della PR #1.
- L'avatar illustrato statico resta predefinito e viene ripristinato se il rig non è disponibile. Lo sfondo arredato rimane indipendente.
- Il rendering Canvas si sospende se la scena è nascosta; rispetta la preferenza \`prefers-reduced-motion\`; la palette del manichino è indipendente dalla luce della stanza e dalla UI.
- Test Node (motore, giunzioni, sintassi): **success**. Test **Playwright Chromium reale** su 390×844 e 1280×900: **success**, 587 e 1012 campioni opachi nel Canvas; cambio palette, pulsante saluto, ritorno al concept, zero errori JavaScript. Run GitHub Actions 43169506173. Nessun test su Samsung Android fisico.
- La pipeline serve ancora esclusivamente il manichino tecnico. Il set artistico semi-realistico finale resta da produrre, suddividere e riggare; non abbiamo ancora dimostrato che la resa alta dei concept sia ottenibile in movimento con questi layer rigidi. Camminata/seduta non implementate.

**Prossima milestone:** prima serie di layer realmente illustrati (testa, occhi e capelli) con pivot adattati, lasciando il resto temporaneamente provvisorio e validando la qualità in movimento.

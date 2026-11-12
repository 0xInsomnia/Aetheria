# Aetheria — Companion 2D

[Apri la demo su GitHub Pages](https://0xinsomnia.github.io/Aetheria/)

**Alpha 0.3**, progetto indipendente da **Neliel 3D**. Si tratta di un'app web statica e responsive, ancora sperimentale, senza API esterne né dipendenze di runtime.

## Prova le funzioni

- **Dialogo:** piccola chat simulata, con risposte locali preimpostate, salvataggio sul browser, lettura vocale se supportata.
- **Azioni:** stati dimostrativi Saluta, Pensa e Relax. Muovono la scena illustrata nel suo insieme: non sono ancora animazioni scheletriche.
- **Stanza:** una **mappa 2.5D schematica interattiva** con cinque punti (finestra, scrivania, lampada, divano, letto), selezione e descrizioni contestuali.
- **Stanza:** accensione/spegnimento lampada, atmosfera notturna o luce calda; preferenze salvate localmente. Bottone per inquadrare la scena.
- **Stile:** palette UI e colore luce ambientale indipendenti, intensità luce, opzione particelle.
- **Inquadrature:** figura intera, scena, dettaglio.

Apri `index.html` tramite GitHub Pages o un server statico (per esempio `python3 -m http.server 8000`).

## Fondamenta tecniche

Il file `src/skeleton2d.mjs` introduce un **motore matematico per futuri sprite a livelli**, con trasformazioni per elemento, interpolazione di pose e campionamento keyframe. **Non è ancora collegato alla scena pubblica:** servono prima illustrazioni tagliate in livelli e pivot corretti. Test unitari in `tests/skeleton2d.test.mjs`, eseguibili con `node --test tests/*.test.mjs`.

## Limiti veri

La foto concept della schermata principale include ancora personaggio e sfondo **in un unico file**. Non è possibile camminare, sedersi, cambiare outfit o animare bocca/occhi in modo reale. La mappa della stanza è un prototipo funzionale di interazione, **non** una stanza esplorabile con locomozione. Non è un chatbot AI con memoria semantica. L'illustrazione provvisoria va corretta rispetto al riferimento umano (orecchie normali).

## Direzione artistica

Companion anime adulta **semi-realistica**, capelli argentati, occhi viola, orecchie umane, proporzioni adulte, outfit nero/viola di base. In futuro: outfit street nero/rosso e ricolorazione **solo con layer e maschere dedicati**. Atmosfera, UI e abiti dovranno essere regolabili indipendentemente.

Il repository è pubblico: **non pubblicare le reference originali o dati personali dell'utente**. Consulta [docs/PROGRESS.md](docs/PROGRESS.md) e [docs/ART_DIRECTION.md](docs/ART_DIRECTION.md).


## Alpha 0.4 — stanza visibile (11 novembre 2026)

La scheda **Stanza** ora apre una **illustrazione completa dell'ambiente arredato** nello stage principale, non soltanto una mappa astratta. L'immagine si trova in `assets/aetheria-room-v04.webp`.

- Letto, lampada, scrivania e finestra hanno pulsanti sovrapposti e collegati alle zone esistenti.
- La vista della stanza diventa visibile per impostazione predefinita e puoi cambiare scheda per tornare al personaggio precedente.
- Un pulsante **Apri la panoramica della stanza** mostra l'illustrazione intera in un dialogo.
- Luci e atmosfera restano controllabili indipendentemente dai colori della UI.
- **Limite:** il personaggio è ancora parte di una singola illustrazione; non cammina nella stanza e gli arredi non sono oggetti tridimensionali.
- Il nuovo sfondo è un asset generato per il progetto. Le reference originali private non sono state pubblicate.

Lo script e la stanza vengono aggiornati direttamente su `main`, senza modifiche al repository `Neliel`.


## Alpha 0.5 — panorama stanza separato

Apri [Aetheria su GitHub Pages](https://0xinsomnia.github.io/Aetheria/?v=0.5) e passa alla scheda **Stanza**. Ora l'ambiente è disegnato in un file SVG indipendente `assets/aetheria-room-empty-v05.svg`, senza Aetheria seduta o sdraiata nell'immagine: letto, monitor, libreria, divano, finestra e luci sono elementi del fondale. La scheda **Dialogo** conserva la scena originale del personaggio. Gli hotspot e i comandi ambientali restano dimostrativi.

Questa è una **panoramica tecnica vettoriale** e non la stanza semi-realistica finale. Aetheria non è ancora uno sprite separato e non cammina nella stanza. Vedi [docs/PROGRESS.md](docs/PROGRESS.md) per le verifiche effettuate.


## Alpha 0.6 — figura separata nella stanza

Una prima figura raster provvisoria è ora **indipendente** dal panorama della stanza. Apri la scheda **Stanza**, usa il controllo **Mostra Aetheria nella stanza** e scegli Centro, Letto, Scrivania o Divano per verificare il posizionamento. La figura non cammina: si tratta soltanto di transizioni di posizione e di una lieve oscillazione dell'immagine completa. Non c'è ancora un rig articolato, e il design provvisorio non rispetta ancora tutti i dettagli approvati (inclusa la forma delle orecchie). Le immagini originali dell'utente non sono state pubblicate. [Dettagli e verifiche](docs/CHARACTER_PREVIEW_V06.md).

## Alpha 0.7 — pipeline animazioni disponibile (12 novembre 2026)

La [demo indipendente delle animazioni](https://0xinsomnia.github.io/Aetheria/character/demo/) è raggiungibile anche da **Azioni → Apri il banco prova delle animazioni** nell'app principale.

La Pull Request [#1](https://github.com/0xInsomnia/Aetheria/pull/1) ha aggiunto la cartella `character/` con scheletro gerarchico, 56 livelli segnaposto, Canvas 2D, gesti, battito occhi, capigliatura, espressioni e maschere di colore. **Non è ancora il personaggio semi-realistico definitivo**. La demo del rig e l'avatar della stanza sono due prototipi grafici distinti, non ancora collegati.

Sono attive verifiche automatiche in `.github/workflows/checks.yml` (test unitari, validator delle giunzioni, sintassi JS). Prima di inserire nuove illustrazioni serve adattare pivot e maschere agli asset veri e valutare la deformazione artistica.

## Alpha 0.8 — rig 2D attivabile nella stanza (12 novembre 2026)

La vista **Stanza** ora ha un selettore sotto i controlli del personaggio:
- **Illustrata** (predefinita): mantiene il concept semi-realistico statico, come nell'Alpha 0.7.
- **Rig animato · demo**: carica *davvero* i 56 sprite segnaposto e li disegna con il renderer Canvas, sopra lo stesso sfondo indipendente. Si possono provare il saluto, il battito delle palpebre, quattro espressioni e le palette nero/viola, nero/rosso e chiaro/azzurro. Il movimento continuo include respirazione e capelli, dove consentito dalle preferenze di accessibilità.

I controlli per spostare la figura fra centro, letto, scrivania e divano rimangono disponibili per entrambe le rappresentazioni. L'app mantiene la figura illustrata come scelta iniziale e torna ad essa anche se gli asset del rig non caricano.

**Limite da evidenziare:** il rig è articolato, ma usa ancora il **manichino segnaposto**: non ha le illustrazioni semi-realistiche definitive, né camminata o posa seduta. L'avatar statico illustrato **non** viene magicamente animato.

Nuovi file: \`src/room-rig-overlay.mjs\` e \`src/room-rig-overlay.css\`. Il test \`tests/room-rig-browser.mjs\` usa Playwright + Chromium con le immagini reali del repository e verifica mobile e desktop. Il workflow GitHub Actions ha completato i test in entrambe le viewport con esito positivo.

[Apri Aetheria Alpha 0.8](https://0xinsomnia.github.io/Aetheria/?v=0.8)

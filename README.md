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

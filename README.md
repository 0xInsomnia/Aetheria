# Aetheria — Companion 2D

[Apri il prototipo su GitHub Pages](https://0xinsomnia.github.io/Aetheria/)

Progetto indipendente da **Neliel 3D**. Alpha **0.2** è una demo HTML/CSS/JS statica e mobile-friendly: nessuna API key e nessuna dipendenza esterna.

## Funziona oggi

- Scena illustrata con **tre inquadrature** selezionabili: figura intera, scena, dettaglio.
- **Sfondo sfocato** e **particelle 2D** su livelli indipendenti rispetto all'illustrazione di scena.
- **Intensità della luce** regolabile (0–100%) ed effetti opzionali.
- Palette UI e luce ambiente separate, persistenti localmente.
- Piccoli feedback al tocco, stati dimostrativi, chat locale simulata e sintesi vocale browser quando disponibile.
- Interfaccia responsive. Preferenze di inquadratura, luce e particelle memorizzate sul dispositivo.

## Limiti reali

**Non c'è ancora un rig del personaggio.** L'immagine è unica e le azioni non muovono singole articolazioni. Non ci sono ancora animazioni di occhi/braccia, espressioni disegnate, cambi di outfit o ricolorazione selettiva degli abiti, riconoscimento vocale o intelligenza conversazionale. Il personaggio attualmente usato è un concept provvisorio precedente alla richiesta di orecchie umane: va sostituito, non rappresenta il design finale.

L'obiettivo è una companion anime **semi-realistica adulta**, con capelli argentati, occhi viola, orecchie umane normali, outfit nero/viola base e, successivamente, preset street nero/rosso. La palette del personaggio sarà indipendente da quella della stanza e della UI una volta disponibili i layer necessari.

## Esecuzione

Apri [index.html](index.html) con un server statico (ad esempio `python3 -m http.server 8000` nella cartella del repository) oppure tramite GitHub Pages. Tutto il codice JavaScript e CSS della demo attuale è incorporato in `index.html` per semplificare il deploy.

I materiali di riferimento originali non sono stati pubblicati. Vedi [docs/PROGRESS.md](docs/PROGRESS.md) per stato e test.

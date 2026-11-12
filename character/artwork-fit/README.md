# Aetheria — Studio di adattamento artistico (Alpha 0.11)

Questa pagina serve a **posizionare le 28 ossa sulla figura attuale** e a esportare una prima mappa dei punti anatomici. È un checkpoint di produzione, non un personaggio animato e non una sostituzione del rig attuale.

[Apri lo studio su GitHub Pages](https://0xinsomnia.github.io/Aetheria/character/artwork-fit/)

## A cosa serve

- Confrontare le proporzioni dell'illustrazione semi-realistica già presente in `assets/aetheria-character-concept-v06.webp` con lo scheletro del collega.
- Controllare e trascinare i pivot, con vista ravvicinata di volto e occhi.
- Salvare temporaneamente le correzioni in `localStorage` ed esportare una mappa JSON senza cambiare il rig condiviso.
- Trasformare le coordinate immagine (1024 × 1536) in coordinate del rig (1000 × 2000) per preparare un futuro master a livelli.

## Cosa **non** fa

- **Non** crea i 56 livelli richiesti e **non** ricostruisce le parti anatomiche nascoste.
- **Non** rende la figura esistente una mesh articolata e non contiene un nuovo blink.
- **Non** dimostra una camminata o un saluto con il personaggio definitivo.
- La vecchia figura è di tre quarti e ha orecchie appuntite: **NON è la reference finale approvata**.

## Prossimo checkpoint artistico

Dipingere un **master neutro frontale in A-pose**, con orecchie umane, capelli argento, occhi viola, proportions adulte e outfit originale; poi separare prima testa, capelli, occhi, collo e braccia in PNG con le zone sovrapposte ricostruite. La mappa presente fornisce una base anatomica da rifinire, **non** i pivot definitivi per quei nuovi livelli.

## Test

`node --test character/artwork-fit/tests/*.test.mjs`

La pagina è in HTML/SVG/JS senza dipendenze. Il master concettuale usato era già pubblico nel repository; nessuna immagine privata originale dell'utente è stata copiata.
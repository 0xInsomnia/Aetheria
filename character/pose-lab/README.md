# Aetheria — Alpha 0.12: studio dei ritagli del personaggio

L'asset importato è il concept trasparente già presente in `assets/aetheria-character-concept-v06.webp`.

Questa cartella crea, tramite Canvas, **tre superfici grafiche indipendenti**:

1. `body` — pixel rimanenti (personaggio statico, non articolato);
2. `hair_back` — ritaglio della chioma con pivot ruotabile;
3. `head` — ritaglio di testa e volto con pivot ruotabile.

Le maschere sono poligoni modificabili, persistiti in localStorage e scaricabili come JSON. La composizione neutra è confrontabile con la sorgente originale e ciascun pezzo è esportabile in un PNG RGBA. Le maschere sono **sperimentali**: non producono ricostruzione pittorica delle superfici nascoste. Il ritaglio può avere fessure e artefatti in movimento.

## Importante: non è il personaggio definitivo

- Concept originale con posa prospettica, braccio proteso e **orecchie appuntite**: contrario alle reference aggiornate. Da correggere su un master completamente nuovo, con orecchie umane e A-pose.
- Il movimento di testa e chioma è una rotazione reale di parti separate, **non** il rig articolato a 28 ossa dell'altro laboratorio; lo scheletro rimane indipendente finché i livelli completi non saranno disegnati.
- Nessun blink: evitiamo le palpebre posticce e il ritratto statico già bocciati.
- Il lavoro serve a verificare tagli, gerarchie di disegno, pivot e allineamento prima di spendere tempo sui 56 asset definitivi.

## Test

`node --test character/tests/pose-lab.test.mjs` (assieme ai test precedenti del repository).

## Preview

`https://0xinsomnia.github.io/Aetheria/character/pose-lab/`

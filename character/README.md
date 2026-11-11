# Aetheria — pipeline del rig 2D del personaggio

Questa cartella contiene la **pipeline tecnica** per animare il personaggio a livelli separati: scheletro gerarchico, formato dei dati, renderer, strumenti di verifica e una demo indipendente.

> **Non contiene il personaggio definitivo.** Gli sprite pubblicati in `sprites/placeholder/` sono un manichino schematico generato da codice, utile solo a provare la pipeline. L'illustrazione master semi-realistica e i livelli dipinti devono ancora essere prodotti; le immagini di riferimento private non sono state ricevute né caricate.

Nulla qui dentro modifica `index.html`, la stanza o l'interfaccia principale.

## Provare la demo

Da un server statico avviato nella radice del repository:

```bash
python3 -m http.server 8000
# poi apri http://localhost:8000/character/demo/
```

Su GitHub Pages il percorso sarà `/Aetheria/character/demo/` dopo il merge su `main` (non verificato: il branch non è pubblicato su Pages).

La demo permette di attivare respirazione, moto dei capelli, battito e sguardo, inclinare la testa, far partire il saluto, cambiare espressione e palette, mostrare ossa, pivot, dischi delle giunzioni e riquadri dei livelli, ruotare ogni osso entro i suoi limiti, far scorrere tutte le articolazioni e trascinare un pivot per correggerlo.

## Struttura

| Percorso | Contenuto |
|---|---|
| `rig/aetheria.rig.json` | Ossa con genitore, pivot, limiti e giunzioni; livelli in ordine di disegno; slot, gruppi colore, palette, espressioni, battito, sguardo |
| `rig/animations.json` | Clip a keyframe: `breathe`, `hairIdle`, `wave` |
| `sprites/<set>/layers.json` | Posizione e dimensione di ogni PNG, in unità del canvas del rig |
| `sprites/placeholder/*.png` | 56 PNG trasparenti segnaposto |
| `src/rig-core.mjs` | Matrici, gerarchia, limiti, validazione (senza DOM) |
| `src/animation.mjs` | Clip, espressioni, battito, sguardo, inclinazione, moto secondario (senza DOM) |
| `src/renderer-canvas.mjs` | Renderer Canvas 2D con colorazione e ritagli, sovrimpressioni di verifica |
| `demo/` | Banco prova indipendente |
| `tools/` | Generatore dei segnaposto, importatore, validatore, anteprime |
| `tests/` | 29 test unitari Node |
| `preview/` | Immagini prodotte dal renderer reale |
| `docs/LAYER_SPEC.md` | Specifica per chi dipinge i livelli definitivi |

## Comandi

```bash
node --test character/tests/*.test.mjs                 # test unitari, nessuna dipendenza
node character/tools/validate-rig.mjs [set]            # verifica rig, clip e sprite
node character/tools/generate-placeholders.mjs         # rigenera il manichino
node character/tools/import-layers.mjs <cartella> <set> [--partial]   # importa illustrazioni
NODE_PATH=$(npm root -g) node character/tools/render-previews.mjs [set]   # anteprime (richiede Playwright)
```

Per vedere un set importato nella demo: `character/demo/?set=<nome>`.

## Come funziona

- **Coordinate.** Pivot e livelli sono espressi nello spazio del canvas in posa di riposo (1000 × 2000 unità, origine in alto a sinistra). I PNG possono avere qualsiasi risoluzione multipla: il renderer li scala sulla geometria dichiarata.
- **Gerarchia.** Ogni osso ruota e scala attorno al proprio pivot ed eredita la trasformazione del genitore. Le pose sono delta rispetto al riposo.
- **Lati.** I suffissi `R` e `L` indicano destra e sinistra *del personaggio*: `R` appare a sinistra sullo schermo.
- **Slot.** Bocca e palpebre sono varianti alternative dello stesso slot; se ne disegna una alla volta.
- **Colori.** I livelli con `tint` sono in scala di grigi e vengono moltiplicati per il colore del gruppo (`outfitPrimary`, `outfitAccent`). Pelle, capelli e tatuaggio sono livelli distinti e non cambiano.
- **Ritagli.** Un livello con `clip` è visibile solo dentro l'alfa di un altro livello: l'iride resta dentro il bianco dell'occhio quando lo sguardo si sposta.
- **Giunzioni.** Per ogni osso con `joint.radius`, gli sprite del figlio e quelli del genitore devono coprire ciascuno l'intero disco attorno al pivot. Se la condizione vale, ruotare il figlio non può aprire buchi. Il validatore la misura sui pixel.

## Parti effettivamente animabili (con gli sprite segnaposto)

| Parte | Ossa | Tipo di movimento |
|---|---|---|
| Respirazione | `torso`, `upperArmR/L`, `head` | Scala e traslazione del busto; spalle, collo e testa seguono per gerarchia |
| Testa | `neck`, `head` | Rotazione distribuita 30 % / 70 %, limiti ±15° e ±20° |
| Occhi | `eyeR`, `eyeL` | Traslazione dell'iride ritagliata nel bianco dell'occhio |
| Palpebre | slot `eyelidR`, `eyelidL` | Tre fotogrammi: aperta, a metà, chiusa; battito automatico o manuale |
| Sopracciglia | `browR`, `browL` | Traslazione e rotazione |
| Bocca | slot `mouth` | Quattro forme: neutra, sorridente, curiosa, sorpresa |
| Espressioni | combinazione | Neutra, sorridente, curiosa, sorpresa, con transizione |
| Capelli | `hairBack`, `ponytail`, `ponytailTip`, `hairSideR/L`, `hairFront` | Oscillazione a keyframe più molla smorzata che reagisce alla testa |
| Braccia | `upperArm`, `forearm`, `hand` (R e L) | Tre segmenti articolati; clip `wave` sul braccio destro |
| Gambe | `thigh`, `shin`, `foot` (R e L) | Articolate e verificate nelle giunzioni; nessun clip pronto |
| Accessorio | `strap` | Molla smorzata |
| Outfit | gruppi `outfitPrimary`, `outfitAccent` | Tre palette più colori liberi |

## Verifiche eseguite

- 29 test unitari superati: matrici, propagazione gerarchica, giunzioni unite, limiti, validazione, clip, espressioni, battito, sguardo, moto secondario, codec PNG, importazione, controllo delle giunzioni (incluso un caso negativo con una mano tagliata al polso).
- Validatore sul set segnaposto: 14 giunzioni coperte al 100 %, nessun errore né avviso.
- Demo in Chromium headless a 1280 × 900 e 390 × 844: posa di riposo stabile, respirazione, saluto con ritorno alla posa iniziale, espressioni, cambio palette, battito, inclinazione, prova delle articolazioni, trascinamento di un pivot, sovrimpressioni; nessun errore JavaScript e nessuno scorrimento orizzontale.
- Le immagini in `preview/` sono generate dal renderer della demo, non ritoccate.

## Limiti e cose mancanti

1. **Nessuna illustrazione definitiva.** Mancano master a figura intera e livelli dipinti. Il manichino non rappresenta volto, proporzioni o outfit approvati.
2. **Sprite rigidi.** Non c'è deformazione a mesh né pesatura: la respirazione è una scala del busto, i capelli sono segmenti che ruotano. Capelli morbidi e pieghe dei tessuti richiederanno più segmenti o una deformazione da aggiungere.
3. **Palpebre e bocca a fotogrammi.** Nessuna interpolazione fra le forme e nessun labiale.
4. **Colorazione per moltiplicazione.** Funziona bene su tessuti dipinti in grigio chiaro; un tessuto nero conserva poco dettaglio d'ombra e le trame multicolore non sono gestite.
5. **Costo dei ritagli.** Ogni livello ritagliato usa un canvas di appoggio grande quanto la vista a ogni fotogramma. Con due iridi è trascurabile su desktop; su telefono reale non è stato misurato.
6. **Camminata e seduta assenti**, come da piano.
7. **Importatore provato solo con immagini sintetiche**, non con un'esportazione reale da Krita o Photoshop. Legge PNG a 8 bit non interlacciati.
8. **Nessuna integrazione** con `index.html`. Il vecchio `src/skeleton2d.mjs` resta invariato; il nuovo nucleo è indipendente.
9. **Non provato** su dispositivi fisici, su Safari o Firefox, né con sprite ad alta risoluzione.
10. La regolazione dei pivot nella demo non salva su file: il JSON va copiato a mano nel rig.

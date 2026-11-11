# Specifica dei livelli per le illustrazioni definitive

Questa pagina descrive che cosa deve consegnare chi dipinge il personaggio perché il rig funzioni senza modifiche al codice. Lo stile resta quello di `docs/ART_DIRECTION.md`: anime semi-realistico adulto, orecchie umane, niente chibi.

## Regole di esportazione

1. **Un PNG trasparente per livello**, a 8 bit per canale, non interlacciato, con il nome esatto della tabella (`upper_arm_R.png`).
2. **Tutti a tutto canvas**, con proporzioni 1 : 2 come il rig (1000 × 2000 unità). Risoluzione consigliata 2000 × 4000 o 3000 × 6000; deve essere la stessa per tutti i livelli.
3. **Posa di riposo**: in piedi, frontale, braccia leggermente staccate dal corpo, gambe separate. I livelli sovrapposti devono ricomporre l'illustrazione master.
4. `R` e `L` sono destra e sinistra **del personaggio**: `R` sta a sinistra nell'immagine.
5. Le reference private non vanno nel repository.

Importazione e controllo:

```bash
node character/tools/import-layers.mjs cartella/esportazione aetheria-v1
node character/tools/validate-rig.mjs aetheria-v1
```

L'importatore ritaglia ogni livello sui pixel visibili e scrive `sprites/aetheria-v1/layers.json`. Con `--partial` accetta livelli mancanti, utile per consegne progressive.

## Parti nascoste da ricostruire

Dove due parti si articolano, **entrambe** devono essere dipinte oltre il punto in cui l'altra le copre. In pratica ogni segmento termina con un'estremità arrotondata completa attorno al pivot.

Per ogni giunzione il rig dichiara un raggio. Il validatore richiede che gli sprite del segmento figlio coprano da soli tutto il disco di quel raggio attorno al pivot, e che lo stesso valga per il segmento genitore.

| Giunzione | Pivot (x, y) | Raggio | Genitore |
|---|---|---|---|
| `neck` | 500, 420 | 26 | `torso` |
| `head` | 500, 330 | 22 | `neck` |
| `upperArmR` / `upperArmL` | 365, 475 / 635, 475 | 34 | `torso` |
| `forearmR` / `forearmL` | 335, 750 / 665, 750 | 30 | `upperArm` |
| `handR` / `handL` | 315, 1010 / 685, 1010 | 22 | `forearm` |
| `thighR` / `thighL` | 435, 930 / 565, 930 | 60 | `hips` |
| `shinR` / `shinL` | 425, 1340 / 575, 1340 | 44 | `thigh` |
| `footR` / `footL` | 420, 1760 / 580, 1760 | 30 | `shin` |

I pivot sono quelli del manichino. Con le illustrazioni vere andranno spostati sulle articolazioni dipinte: nella demo si attiva «Trascina il pivot dell'osso selezionato» e si copia il JSON risultante in `rig/aetheria.rig.json`. Anche i raggi vanno adattati allo spessore reale degli arti.

Altri punti da ricostruire, non controllati in automatico:

- la pelle del busto sotto top e giacca, e delle gambe sotto stivali e calze, se si prevedono outfit che le scoprono;
- la fronte sotto la frangia e il cranio sotto i capelli, perché i capelli si muovono;
- il bianco dell'occhio completo sotto la palpebra e l'iride intera, più larga dell'apertura visibile;
- il collo fin dentro la testa e dentro il busto.

## Elenco dei livelli

L'ordine è quello di disegno, dal fondo al primo piano.

| Livello | Osso | Note |
|---|---|---|
| `hair_back` | `hairBack` | Massa posteriore dei capelli |
| `ponytail_tip`, `ponytail` | `ponytailTip`, `ponytail` | Coda alta in due segmenti |
| `thigh_L`, `thigh_R` | `thighL`, `thighR` | Pelle |
| `tattoo_thigh_R` | `thighR` | Tatuaggio geometrico, mai colorato dalle palette |
| `foot_*`, `shin_*` | `foot*`, `shin*` | Pelle |
| `boot_foot_*`, `boot_shin_*` | `foot*`, `shin*` | Colorabile, gruppo `outfitPrimary` |
| `boot_trim_*` | `shin*` | Colorabile, gruppo `outfitAccent` |
| `torso` | `torso` | Pelle di busto e spalle |
| `top` | `torso` | Colorabile, `outfitPrimary` |
| `top_trim` | `torso` | Colorabile, `outfitAccent` |
| `hips` | `hips` | Pelle del bacino |
| `shorts` | `hips` | Colorabile, `outfitPrimary` |
| `belt` | `hips` | Colorabile, `outfitAccent` |
| `strap` | `strap` | Accessorio mobile, `outfitAccent` |
| `neck` | `neck` | |
| `head` | `head` | Viso senza occhi, sopracciglia e bocca; orecchie umane |
| `eye_white_R`, `eye_white_L` | `head` | Fanno da ritaglio per le iridi |
| `iris_R`, `iris_L` | `eyeR`, `eyeL` | Iride viola con pupilla e riflesso |
| `eyelid_R_open`, `_half`, `_closed` (e `L`) | `head` | Slot `eyelidR` / `eyelidL`; ciglia incluse |
| `brow_R`, `brow_L` | `browR`, `browL` | |
| `mouth_neutral`, `_smile`, `_curious`, `_surprised` | `head` | Slot `mouth` |
| `hair_side_R`, `hair_side_L` | `hairSideR`, `hairSideL` | Ciocche laterali |
| `hair_front` | `hairFront` | Frangia |
| `upper_arm_*`, `forearm_*`, `hand_*` | `upperArm*`, `forearm*`, `hand*` | Pelle |
| `sleeve_upper_*`, `sleeve_fore_*` | `upperArm*`, `forearm*` | Giacca, `outfitPrimary` |
| `cuff_*` | `forearm*` | `outfitAccent` |

Aggiungere, togliere o rinominare livelli è possibile modificando `rig/aetheria.rig.json`: l'outfit definitivo avrà probabilmente più pezzi di questo elenco di prova (giacca sul busto, cinturini, calze).

## Livelli colorabili

- Si dipingono **in scala di grigi**: luci e ombre del tessuto, senza tinta. Il validatore rifiuta pixel colorati.
- Il colore finale è grigio × colore del gruppo. Un grigio chiaro (circa 230) restituisce il colore pieno; le ombre lo scuriscono.
- Ogni zona con un colore indipendente è un livello separato assegnato a un gruppo. Nuovi gruppi si dichiarano in `tintGroups` e in ogni voce di `palettes`.
- Dettagli che non devono cambiare colore (fibbie metalliche, loghi, tatuaggio) restano livelli normali a colori.

## Varianti del volto

- **Palpebre**: tre immagini per occhio. `closed` deve coprire del tutto il bianco dell'occhio con pelle dipinta.
- **Bocca**: quattro immagini. Altre forme si aggiungono come nuovi livelli con `slot: "mouth"` e una nuova `variant`.
- **Sopracciglia**: un'immagine per lato; il movimento è dato dall'osso.
- Nuove espressioni si definiscono in `expressions` combinando varianti e spostamenti delle ossa.

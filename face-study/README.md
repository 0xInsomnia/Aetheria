# Aetheria — studio del volto semi-realistico (Alpha 0.10)

## Cosa prova questa pagina

Il laboratorio in `face-study/index.html` sperimenta una transizione **dal concept pittorico statico verso livelli grafici indipendenti**, senza sostituire il rig del corpo.

- Immagine del volto `assets/portrait_open.webp` — concept generato per Aetheria, **non** file originale privato dell'utente.
- Palpebre su `<canvas>` con sequenza aperto → metà → chiuso → metà → aperto.
- L'overlay delle palpebre copre soltanto due piccole aree; il resto del ritratto non viene sostituito.
- Ciocca illustrativa selezionata con `clip-path`, mossa molto delicatamente da CSS: studio della separazione dei capelli, non fisica reale.
- Controlli manuali, battito automatico, gestione visibilità pagina e rispetto di `prefers-reduced-motion`.

## Realtà del prototipo

Le palpebre vengono **simulate** disegnando texture della pelle vicina e una curva della rima palpebrale; non sono sprite dipinti a mano e possono essere visivamente imprecise, in particolare a zoom elevato. La base contiene ancora capelli e sfondo nello stesso raster; la ciocca aggiuntiva non sostituisce il fondale da ricostruire. Il personaggio **non è ancora collegato al rig a 28 ossa e 56 livelli**.

Questo laboratorio non deve essere usato come riferimento di qualità finale, ma come test di coordinate, transizioni e composizione.

## Passaggio agli asset definitivi

Il prossimo set dovrebbe contenere almeno:

1. Viso pulito senza occhi, bocca, sopracciglia, frangia e capelli — parti coperte ricostruite.
2. Bianco occhi, iridi, palpebre aperte/metà/chiuse, sopracciglia distinte.
3. Capelli posteriori, ciocche anteriori, laterali e coda con porzioni nascoste ricostruite.
4. Maschere in scala di grigi per tessuto e accessori con colori modificabili senza alterare pelle.
5. **Prova di ricomposizione e rig** usando la specifica `character/docs/LAYER_SPEC.md`.

Utilizzare una master art adulta semi-realistica, occhi viola, orecchie **umane** e proporzioni coerenti fra pose. Non pubblicare le immagini originali private di riferimento.

## Verifica

`node tests/face-study-browser.mjs` avvia il browser Chromium di Playwright con server statico locale (Playwright richiesto per lo sviluppo). GitHub Actions esegue il test per smartphone simulato 390×844 e desktop 1280×900, controllando il caricamento del ritratto, i pixel delle palpebre, i controlli e l'assenza di errori JS.

L'obiettivo successivo è un set pittorico pulito di occhi e capelli, **non** moltiplicare gli effetti sull'immagine unica.

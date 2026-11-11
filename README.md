# Aetheria — companion 2D

Progetto **indipendente da Neliel**. Alpha 0.1 è un prototipo web responsive che dimostra l'interfaccia e le prime interazioni della futura companion anime semi-realistica.

## Avvio

Apri `index.html` nel browser oppure avvia un server statico locale (`python3 -m http.server 8000`). Nessuna API key o dipendenza esterna necessaria.

## Funzioni attuali

- Schermata responsive con scena illustrata nero/viola.
- Sezioni **Dialogo**, **Azioni**, **Stile**.
- Cambi di colore indipendenti per **interfaccia** e **luce ambientale**, persistenti nel browser.
- Stati dimostrativi idle, saluta, pensa e relax (transizioni applicate all'immagine completa).
- Chat **simulata** con risposte locali predefinite, cronologia e reset tramite `localStorage`.
- Lettura vocale tramite Web Speech API quando supportata.

## Da sviluppare

Non esiste ancora un avatar 2D riggato: nessuna animazione articolata, espressione facciale animata, camminata, seduta, outfit modulari o colore selettivo degli abiti. Nessuna integrazione AI, memoria semantica o ascolto vocale.

## Direzione artistica

Anime **semi-realistico adulto**, capelli argentati lunghi, occhi viola, **orecchie umane**, outfit base nero/viola, tatuaggio geometrico. Lo street nero/rosso sarà un preset successivo. L'illustrazione attuale è un concept, non un rig animabile.

Le immagini originali di riferimento non vengono pubblicate. Ulteriori dettagli in [docs/PROGRESS.md](docs/PROGRESS.md).

# Aetheria — Art direction e pipeline di produzione

## Identità approvata (non ancora modellata nel rig)

- Stile **anime semi-realistico adulto**, vicino ai concept scelti, non chibi.
- Proporzioni adulte, silhouette coerente fra pose e viste.
- **Orecchie umane normali**, senza punte elfiche.
- Capelli argentati lunghi, raccolti in parte in coda alta con ciocche mobili.
- Occhi viola, make-up discreto, viso espressivo e maturo.
- Outfit iniziale nero/viola, giacca morbida, accessori tecnologici, tatuaggio geometrico sulla coscia.
- Outfit successivo nero/rosso streetwear con taglio asimmetrico, cinture e sneakers chunky.
- **Palette della stanza, interfaccia e outfit indipendenti.** Colori degli abiti da cambiare soltanto tramite maschere dedicate, non filtri globali.

## Pipeline tecnica — evitare un’immagine unica

La preview statica non basta: per un personaggio che compie azioni servono sprite e porzioni nascoste ricostruite, non solo un PNG con sfondo rimosso. Creare varianti coerenti di volto, mani e arti.

Layer minimi proposti:

1. hair_back, hair_side, hair_front e accessori capelli;
2. torso, neck, face, occhi e sopracciglia (blink/gaze), mouth-shapes;
3. upper_arm_L/R, forearm_L/R, hands_L/R;
4. hips, thigh_L/R, shin_L/R, feet_L/R;
5. outfit per livello: top, giacca/maniche, shorts, calze, scarpe e cinturini;
6. shadow/light overlays e maschere per tessuto/cuoio/accenti.

Ogni parte deve avere dimensioni coerenti e un **pivot** definito; la struttura gerarchica è indispensabile. Prima di pubblicare asset, verificare lato frontale e tre quarti, dita, estremità di capelli e tatuaggio.

## Sequenza di test dell’animazione

1. Idle: respirazione e trasferimento del peso, capelli secondari;
2. occhi: blink e sguardo indipendenti, più tre espressioni;
3. un gesto di saluto con movimento reale della spalla e avambraccio;
4. posa seduta (sprite dedicato e transizione), solo dopo rig verificato;
5. camminata, cambio outfit e colore selettivo.

La stanza dovrà infine usare **background artistico separato dal personaggio**, profondità e target 2D per le zone. La mappa dell’Alpha 0.3 è uno schema per comandi e stati, non l’ambientazione finale.

## Controllo qualità

- Confrontare il viso approvato con ingrandimenti coerenti, senza cambiare identità fra pose.
- Conservare il profilo del corpo proporzionato alla reference: niente chibi.
- Non chiamare “animazione scheletrica” una traslazione dell'immagine completa.
- Non committare reference originali fornite in chat nel repository pubblico.
- Nessun asset protetto copiato da videogiochi o artisti terzi.

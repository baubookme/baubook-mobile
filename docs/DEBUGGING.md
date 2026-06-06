# BauBook - debugging parlante

## Errori React

`AppErrorBoundary` mostra una schermata BauBook con:

- messaggio errore;
- stack trace JS;
- component stack React.

Lo stesso errore finisce nel terminale con prefisso:

```txt
[BauBook render error]
```

## Errori runtime globali

Il global handler intercetta errori fatal, errori web e promise non gestite con prefissi:

```txt
[BauBook runtime]
[BauBook web error]
[BauBook unhandled promise]
```

La tab `Setup` mostra anche `Ultimo errore runtime`.

## Diagnostica ambiente

```powershell
.\baubook.ps1 -Mode doctor
```

Controlla:

- Node/npm;
- registry pubblico npm;
- package-lock senza registry interni;
- Java/JDK 17+;
- Expo e dipendenze principali;
- ADB/emulatore;
- typecheck;
- Expo dependency check.

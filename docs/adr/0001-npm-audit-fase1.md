# 0001 — Vulnerabilidades de `npm audit` resueltas con overrides acotados, resto documentado

**Fecha:** 2026-11-17

## Contexto

Auditoría de arquitectura/seguridad por fases (rama `refactor/arquitectura-seguridad`), Fase 1.
`npm audit` reportaba 57 vulnerabilidades (1 crítica, 25 altas, 30 moderadas, 1 baja).

## Problema / Decisión

`npm audit fix` (sin `--force`) se probó primero y se descartó: en vez de bajar el conteo, lo subió
a 78 — el lockfile estaba desincronizado de antes (`package-lock.json` tenía `"version": "1.5.0"`
mientras `package.json` dice `1.1.0`, residuo de un release viejo) y regenerarlo completo arrastró
versiones transitivas nuevas sin control. Se revirtió con `git checkout -- package.json
package-lock.json` antes de seguir.

En su lugar, se agregó un bloque `overrides` en `package.json` apuntado solo a 3 dependencias
TRANSITIVAS confirmadas como vulnerables de verdad (versión instalada dentro del rango vulnerable
de la propia librería, no solo porque un paquete padre la arrastra):

- `@grpc/grpc-js` 1.9.16 → `1.14.7` (certificados no autorizados devueltos como autorizados,
  mensajes de error internos expuestos al cliente — llega por `firebase` → `@firebase/firestore`).
- `decode-uri-component` 0.2.2 → `0.5.1` (DoS por decodificación exponencial — llega por
  `expo-router` → `query-string`).
- `shell-quote` 1.8.3 → `1.12.0` (CRÍTICA: `quote()` no escapa saltos de línea; más un DoS de
  complejidad cuadrática — llega por `react-devtools-core`, solo herramienta de debugging).

Ningún paquete de primer nivel pineado (`expo`, `expo-router`, `react-native`, `firebase`,
`@react-native-firebase/app`) cambió de versión — verificado con `npm ls` antes/después. Resultado:
57 → 47 vulnerabilidades, 0 críticas (antes 1).

**Dos hallazgos de `npm audit` descartados por ser falsos positivos** (la versión instalada en
disco ya está por ENCIMA del rango que el aviso marca como vulnerable, sin ningún override de por
medio): `nanoid@3.3.20` (vulnerable: `<=3.3.17`) y `re2js@2.10.0` (vulnerable: `2.2.0 - 2.8.6`). No
se tocaron — probablemente la base de datos de advisories de npm tiene datos desactualizados para
estos dos paquetes puntuales.

**Las 47 restantes quedan documentadas como aceptadas, no arregladas en esta fase**: las 16 altas +
30 moderadas + 1 baja que quedan viven TODAS en herramientas de build/test/lint
(`@expo/cli`/`@expo/config*`/`@expo/metro-config`/`@expo/prebuild-config`/`xcode`/`uuid`, usadas
solo por `expo prebuild`/`expo run:android` en la máquina de desarrollo; `@jest/*`/`jest*` y
`@typescript-eslint/*`, usadas solo por `npm test`/`npm run lint`; `@babel/*`/`browserslist`,
transpilación en build time; `postcss`/`postcss-selector-parser`/`source-map-js`, build de
Tailwind/Metro; `glob`/`minimatch`/`picomatch`/`brace-expansion`/`js-yaml`/`node-forge`; `ws`/
`compression`, servidor de desarrollo de Metro que solo corre en `localhost` durante `npm start`;
`zod`, dependencia interna de `@expo/cli` — se confirmó con `grep` que el código de `app/`/`src/`
no importa `zod` directamente). Ninguna de estas corre en el bundle JS que se instala en el
teléfono del usuario final — el riesgo real es bajo (afectaría a la máquina de desarrollo, no a la
app en producción). Arreglarlas de verdad exige subir el SDK de Expo (55 → el que tenga esas
versiones parcheadas), que está fuera del alcance de una auditoría de seguridad puntual y tiene su
propio riesgo de breaking changes — se deja como tarea aparte, a evaluar junto con el próximo salto
de SDK de Expo.

## Consecuencias

- Revisar este ADR antes de correr `npm audit fix --force` a futuro — ya se demostró que puede
  bajar la versión de una dependencia de runtime pineada a propósito (ver advertencia de
  `scripts/build-android.sh`/`.npmrc` sobre peer deps).
- Si un futuro `npm audit` deja de marcar `nanoid`/`re2js` como vulnerables, confirma que era un
  falso positivo y no hace falta acción.
- Al subir el SDK de Expo, volver a correr `npm audit` completo — varias de las 47 restantes
  deberían resolverse solas con ese bump.

Código: `package.json` → bloque `overrides`.

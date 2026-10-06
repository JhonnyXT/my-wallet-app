# PLAY_DATA_SAFETY.md — Respuestas para Google Play Console

Guía para llenar a mano las secciones de **Contenido de la app** de Play Console con lo que la
app hace de verdad desde la sync con Firebase (Fases 2–4 de [`SYNC_ROADMAP.md`](SYNC_ROADMAP.md)).
Verificado contra el código el 2026-10-05. Si cambia qué se sube a la nube (`src/sync/`), revisar
esta guía, `docs/privacy-policy.html` y `landing/src/legal/docs.ts` a la vez.

## URLs

| Campo de Play Console | Valor |
|---|---|
| Política de privacidad | `https://jhonnyxt.github.io/my-wallet-app/privacy-policy.html` |
| URL para eliminar la cuenta | `https://usemywallet.vercel.app/es/delete-account` |

## Seguridad de los datos (Data safety)

### Preguntas generales

| Pregunta | Respuesta | Por qué |
|---|---|---|
| ¿La app recopila o comparte alguno de los tipos de datos requeridos? | **Sí** | Con sesión iniciada, el respaldo sale del teléfono hacia Firebase. |
| ¿Todos los datos se encriptan en tránsito? | **Sí** | El SDK de Firebase solo habla por TLS. |
| ¿Ofreces una forma de pedir que se borren los datos? | **Sí** | En la app (Ajustes → Cuenta → Eliminar cuenta) y por la URL de arriba. |
| ¿La app permite crear una cuenta? | **Sí, con OAuth** (Google) | Login opcional (`src/sync/session.ts`). |

### Tipos de datos

Todos se marcan **Recopilado: sí · Compartido: no · Procesamiento efímero: no · Opcional: sí**
(el usuario puede usar la app sin iniciar sesión y entonces no sale nada del teléfono).

| Categoría de Play → tipo | Qué es en MyWallet | Propósitos |
|---|---|---|
| Información personal → **Nombre** | Nombre de Google (Firebase Auth) y el primer nombre que ven los miembros de una lista compartida | Funcionalidad de la app, Administración de la cuenta |
| Información personal → **Dirección de correo** | Correo de Google (Firebase Auth) | Administración de la cuenta |
| Información personal → **IDs de usuario** | `uid` de Firebase | Funcionalidad de la app, Administración de la cuenta |
| Información financiera → **Otra información financiera** | Movimientos (monto, descripción, categoría, fecha, etiquetas, método de pago, quién pagó), presupuestos, pago esperado, metas, deudas | Funcionalidad de la app |
| Actividad en la app → **Otro contenido generado por el usuario** | Listas, categorías propias, nombres de las personas de una lista | Funcionalidad de la app |

**No** declarar (no salen del teléfono por la app, o no se tocan):

- **Contenido de notificaciones / mensajes**: se procesa solo en el dispositivo; la cola de
  pendientes no se sube (Regla inmutable #6). Solo sube el movimiento que el usuario confirma, y
  ese ya está declarado como información financiera.
- **Audio**: la app no graba ni envía audio. La transcripción la hace el reconocimiento de voz
  del sistema (Google), fuera de la app; lo cuenta la política de privacidad.
- **IDs del dispositivo, ubicación, contactos, fotos, historial web, diagnósticos/fallos,
  analíticas**: no hay Analytics, Crashlytics, publicidad ni FCM; solo
  `@react-native-firebase/app`, `auth` y `firestore`.
- **Información de pago del usuario** (números de tarjeta/cuenta): nunca se guarda.

"Compartido: no" porque Firebase actúa como **proveedor de servicio** (procesa en nuestro nombre)
y lo que ve otra persona en una lista compartida es una transferencia que el propio usuario
inicia y espera; ninguno de los dos casos cuenta como "compartir" según Play.

## Otras secciones de Contenido de la app

- **Acceso a la app**: todo funciona sin cuenta; marcar que no hace falta login para revisarla
  (si piden credenciales, aclarar que "Ahora no" en el primer paso entra sin cuenta).
- **Anuncios**: no tiene.
- **Público objetivo**: 18+ (o 13+), no dirigida a niños; coincide con la política.
- **Funciones financieras**: es una app de presupuesto/registro personal; no presta, no mueve
  dinero ni se conecta a bancos (solo lee notificaciones en el teléfono).

## Permisos que no se usan (bloqueados)

`android.blockedPermissions` en `app.config.ts` quita del manifest final cuatro permisos que traen
librerías o el template y la app nunca usa: `READ_PHONE_STATE`
(`react-native-android-notification-listener`), `READ_EXTERNAL_STORAGE`/`WRITE_EXTERNAL_STORAGE`
(`expo-file-system`; el CSV usa la caché privada y el selector del sistema) y
`SYSTEM_ALERT_WINDOW` (template de Expo; el build debug lo conserva para las herramientas de
desarrollo). Antes de subir un build, confirmarlo en el manifest mergeado
(`android/app/build/intermediates/merged_manifest/release/`).

## Atender una solicitud de eliminación por correo

La página de eliminación manda a pedirla por correo **desde la cuenta de Google** que se quiere
borrar (así ya viene verificado quién la pide). Si llega desde otro correo, responder pidiendo
que escriban desde el de la cuenta. Plazo comprometido: 30 días.

1. Firebase Console → proyecto `mywallet-prod` (o `mywallet-test-jb` si es un tester) →
   **Authentication** → buscar el correo → copiar el `uid`.
2. **Firestore** → `users/{uid}` → eliminar el documento con sus subcolecciones
   (o `npx firebase-tools firestore:delete users/<uid> --recursive --project mywallet-prod`).
3. Espacios: buscar en `spaces` los documentos con `ownerUid == uid` y eliminarlos con sus
   subcolecciones (y sus `inviteCodes`); en los demás donde esté en `memberUids`, quitarlo de
   `memberUids` y poner `leftAt` en su documento de `members` (igual que hace la app al salir).
4. **Authentication** → eliminar el usuario.
5. Responder confirmando que se borró.

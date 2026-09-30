# Spec 085: Desmantelamiento de Pool HLS y Adopción de Servidores Individuales (HLS - S14, HLS - S18, etc.) con Fallback Natural

## Contexto y Motivación
Anteriormente, los servidores nativos HLS (como S14 MegaEmbed, S18 WatchPlay, S17 NasriPlay, S19 Cinecalidad) eran agrupados y consolidados en un único objeto virtual `Source` con nombre `"HLS"` y `ord: 0`, utilizando un mapa de URLs (`urlServerMap`) y `backupUrls` cruzados entre servidores.
Este sistema presentó diversas complicaciones:
1. **Condiciones de Carrera (Race Conditions):** Si un servidor (ej: S14 o S18) tardaba más en resolver que el otro, el que respondía primero creaba o dominaba la pool; cuando el segundo terminaba, alteraba la pool o cambiaba la URL principal, lo que podía causar parpadeos, reinicios no deseados del reproductor o inconsistencias de estado.
2. **Opacidad para el Usuario:** En el selector de servidores, todos los streams HLS aparecían amontonados bajo una única tarjeta `"HLS #0"`, impidiendo al usuario elegir de forma manual y directa entre el servidor S14 o el servidor S18.
3. **Complejidad de Fallback Artificial:** En vez de utilizar el mecanismo nativo de fallback entre servidores (`useSourceFallback`), se dependía de un fallback interno de URLs secundarias mezcladas en un solo reproductor.

El usuario solicita:
> "es mejor eliminar el sistema de pool y dejar algo como HLS - S14, HLS - S18, etc asi no hay problemas de que uno carga primero y otro despues, menos errores si uno falla entoncc se aplica fallback al otro server y asi, usa sdd"

## Objetivos
1. **Eliminar la consolidación de Pool HLS virtual (`ord: 0`, `providerName: "HLS"`):**
   - Cada proveedor con stream HLS extraído se emite como su propia fuente `Source` individual e independiente.
   - Las etiquetas de nombre siguen el formato solicitado: `providerName: "HLS - S14"`, `providerName: "HLS - S18"`, `providerName: "HLS - S17"`, `providerName: "HLS - S19"`.
   - Cada servidor conserva su propio `ord` (ej. 14, 18, 17, 19) e ID único (ej. `megaembed-hls`, `watchplay-hls`, `nasriplay-hls`, `cinecalidad-hls`).
2. **Aislamiento de Backups por Servidor:**
   - `backupUrls` de `HLS - S14` contiene única y exclusivamente los espejos/opciones de S14 (ej. opciones 4 y 5 de MegaEmbed).
   - `backupUrls` de `HLS - S18` contiene única y exclusivamente los espejos de S18 (WatchPlay).
   - No se cruzan URLs entre proveedores diferentes dentro de la misma tarjeta.
3. **Fallback Natural e Ininterrumpido:**
   - La conmutación entre servidores se realiza a través de `useSourceFallback`: si `HLS - S14` falla o se agota su tiempo, el sistema conmuta limpia y automáticamente a `HLS - S18` (o viceversa) notificando al usuario en pantalla:
     *"O servidor HLS - S14 falhou. Conectando a HLS - S18..."*
4. **Actualizaciones Asíncronas en Cliente sin Colisiones:**
   - En `app/watch/page.tsx`, `mergeExtractedStreams` actualiza o reemplaza únicamente la tarjeta correspondiente a dicho proveedor (ej. el iframe de S14 se convierte en `HLS - S14`, o el iframe de S18 se convierte en `HLS - S18`) sin tocar la tarjeta de los demás servidores ni recrear pools virtuales.
   - Si un servidor responde después del inicio de la reproducción, su tarjeta simplemente se actualiza en la lista de servidores sin reiniciar la reproducción activa del usuario.
5. **Transparencia en UI:**
   - En la cabecera y en el grid (`SourceSelectorGrid.tsx` y `NativeSourcePlayer.tsx`), cada servidor muestra claramente su identidad: `#14 HLS - S14`, `#18 HLS - S18`, `#17 HLS - S17`.

## Casos de Uso
- **Caso 1: Resolución inicial con S14 y S18 en Portugués:**
  El resolver (`/api/resolve`) entrega `HLS - S14` (#14, prioridad 120) y `HLS - S18` (#18, prioridad 120). Ordenados por afinidad de idioma y `ord`, `HLS - S14` se sitúa en la posición 0 como recomendado. En la posición 1 aparece `HLS - S18`.
- **Caso 2: Fallo de S14 y conmutación a S18:**
  Si el stream de S14 genera error de red o timeout, `useSourceFallback` avisa al usuario y salta inmediatamente a `HLS - S18`, que comienza a reproducir de inmediato.
- **Caso 3: Selección manual por el usuario:**
  El usuario hace clic directamente en la tarjeta `#18 HLS - S18` y el reproductor cambia de forma inmediata a S18.
- **Caso 4: Servidor Beta:**
  Un servidor en modo beta (`isBeta: true`) conserva su etiqueta de prueba (ej. `HLS - S18 (Beta)`) y su penalización de prioridad.

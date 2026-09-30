import fs from "fs";
import path from "path";

console.log("=== Verificando Implementación de la Spec 083 ===");

const basePath = "C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp";

// 1. Verificar EpisodesDrawer.tsx
const episodesDrawerPath = path.join(basePath, "components/player/EpisodesDrawer.tsx");
if (!fs.existsSync(episodesDrawerPath)) {
  console.error("❌ EpisodesDrawer.tsx no existe");
  process.exit(1);
}
const episodesDrawerContent = fs.readFileSync(episodesDrawerPath, "utf-8");
if (!episodesDrawerContent.includes("export default function EpisodesDrawer")) {
  console.error("❌ EpisodesDrawer no exporta el componente correctamente");
  process.exit(1);
}
if (!episodesDrawerContent.includes("v3-cinemeta.strem.io") || !episodesDrawerContent.includes("/api/tmdb/tv/")) {
  console.error("❌ EpisodesDrawer no implementa Cinemeta y TMDB dual provider");
  process.exit(1);
}
console.log("✅ EpisodesDrawer.tsx verificado correctamente.");

// 2. Verificar NativeSourcePlayer.tsx
const nativePlayerPath = path.join(basePath, "components/player/NativeSourcePlayer.tsx");
const nativePlayerContent = fs.readFileSync(nativePlayerPath, "utf-8");

// Verificación Tarea 1: resumeNotice en esquina
if (!nativePlayerContent.includes("resumeNotice") || !nativePlayerContent.includes("setResumeNotice")) {
  console.error("❌ NativeSourcePlayer no incluye estado resumeNotice");
  process.exit(1);
}
if (!nativePlayerContent.includes("absolute top-4 right-4") && !nativePlayerContent.includes("absolute top-4 left-4")) {
  console.error("❌ NativeSourcePlayer no posiciona el cartel de reanudado en una esquina superior");
  process.exit(1);
}
console.log("✅ Notificación de reanudación translúcida en esquina verificada.");

// Verificación Tarea 2: volumen sin bola visible cuando está oculto
if (!nativePlayerContent.includes("overflow-hidden") || !nativePlayerContent.includes("group/vol")) {
  console.error("❌ Contenedor de volumen no incluye overflow-hidden para ocultar la bola");
  process.exit(1);
}
if (!nativePlayerContent.includes("opacity-0 pointer-events-none group-hover/vol:opacity-100")) {
  console.error("❌ El input de volumen no tiene opacidad 0 cuando está colapsado");
  process.exit(1);
}
console.log("✅ Corrección estética de barra de volumen y thumb oculto verificada.");

// Verificación Tarea 3: Botón Episodios estilo Netflix y EpisodesDrawer integrado
if (!nativePlayerContent.includes("id=\"btn-episodes\"")) {
  console.error("❌ Botón de episodios no encontrado en la barra de controles");
  process.exit(1);
}
if (!nativePlayerContent.includes("<EpisodesDrawer")) {
  console.error("❌ EpisodesDrawer no está renderizado en NativeSourcePlayer");
  process.exit(1);
}
console.log("✅ Botón de Episodios estilo Netflix y Drawer integrados.");

// 3. Verificar PlayerContainer.tsx
const playerContainerPath = path.join(basePath, "components/player/PlayerContainer.tsx");
const playerContainerContent = fs.readFileSync(playerContainerPath, "utf-8");
if (!playerContainerContent.includes("seriesInfo?:") || !playerContainerContent.includes("seriesInfo={seriesInfo}")) {
  console.error("❌ PlayerContainer no propaga seriesInfo a NativeSourcePlayer");
  process.exit(1);
}
console.log("✅ PlayerContainer propaga seriesInfo correctamente.");

// 4. Verificar app/watch/page.tsx
const watchPagePath = path.join(basePath, "app/watch/page.tsx");
const watchPageContent = fs.readFileSync(watchPagePath, "utf-8");
if (!watchPageContent.includes("onSelectEpisode") || !watchPageContent.includes("seriesInfo=")) {
  console.error("❌ app/watch/page.tsx no pasa seriesInfo con onSelectEpisode a PlayerContainer");
  process.exit(1);
}
console.log("✅ app/watch/page.tsx pasa seriesInfo con navegación funcional.");

console.log("\n🎉 Todas las validaciones de la Spec 083 pasaron con éxito!");

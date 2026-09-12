"use client";

import React, { useEffect, useState, useRef } from "react";

interface VersionInfo {
  latestVersion: string;
  versionCode: number;
  tag: string;
  name: string;
  apkUrl: string;
  releaseNotes: string;
}

interface BridgeStatus {
  status: "idle" | "downloading" | "completed" | "error";
  progress: number;
  bytesDownloaded: number;
  totalBytes: number;
  error?: string;
}

// Comparación semántica de versiones (ej. "5.61" > "5.60", "5.60.1" > "5.60")
function isNewerVersion(latest: string, current: string): boolean {
  if (!latest || !current) return false;
  const cleanL = latest.replace(/^[^\d]*/, "").trim();
  const cleanC = current.replace(/^[^\d]*/, "").trim();
  if (cleanL === cleanC) return false;

  const partsL = cleanL.split(".").map((n) => parseInt(n, 10) || 0);
  const partsC = cleanC.split(".").map((n) => parseInt(n, 10) || 0);
  const maxLen = Math.max(partsL.length, partsC.length);

  for (let i = 0; i < maxLen; i++) {
    const l = partsL[i] || 0;
    const c = partsC[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export default function AppUpdater() {
  const [isNative, setIsNative] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>("");
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [bytesInfo, setBytesInfo] = useState<{ downloaded: number; total: number }>({
    downloaded: 0,
    total: 0,
  });
  const [updateState, setUpdateState] = useState<
    "countdown" | "downloading" | "completed" | "error"
  >("countdown");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [canInstall, setCanInstall] = useState<boolean>(true);

  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const primaryBtnRef = useRef<HTMLButtonElement | null>(null);

  // 1. Inicialización y verificación de versión
  useEffect(() => {
    if (typeof window === "undefined") return;

    const bridge = (window as any).AndroidUpdater;
    if (!bridge) {
      // No estamos en la app nativa Android, no ejecutar updater
      return;
    }

    setIsNative(true);
    const installed = bridge.getAppVersion ? bridge.getAppVersion() : "1.0.0";
    setCurrentVersion(installed);

    if (bridge.canInstallPackages) {
      try {
        setCanInstall(Boolean(bridge.canInstallPackages()));
      } catch {}
    }

    // Consulta la API de versiones
    fetch("/api/app/version")
      .then((res) => res.json())
      .then((data: VersionInfo) => {
        if (!data || !data.latestVersion) return;

        // Comprueba si el usuario ya pospuso esta versión específica en esta sesión
        const postponedKey = `tvshow_update_postponed_${data.latestVersion}`;
        const isPostponed = sessionStorage.getItem(postponedKey) === "1";

        if (isNewerVersion(data.latestVersion, installed) && !isPostponed) {
          setVersionInfo(data);
          setShowModal(true);
          setUpdateState("countdown");
          setCountdown(5); // 5 segundos para auto-actualizar
        }
      })
      .catch((err) => {
        console.warn("[AppUpdater] No se pudo verificar versión:", err);
      });
  }, []);

  // 2. Temporizador de cuenta regresiva para auto-actualización
  useEffect(() => {
    if (!showModal || updateState !== "countdown" || countdown === null) return;

    if (countdown <= 0) {
      // Tiempo cumplido: Iniciar actualización automáticamente
      startUpdate();
      return;
    }

    countdownTimerRef.current = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => {
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    };
  }, [countdown, showModal, updateState]);

  // 3. Foco automático para control remoto al abrir el modal
  useEffect(() => {
    if (showModal && primaryBtnRef.current) {
      setTimeout(() => {
        primaryBtnRef.current?.focus();
      }, 100);
    }
  }, [showModal, updateState]);

  // 4. Iniciar descarga del APK
  const startUpdate = () => {
    if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    setCountdown(null);

    const bridge = (window as any).AndroidUpdater;
    if (!bridge || !versionInfo?.apkUrl) {
      setErrorMessage("No se encontró el enlace de descarga o el puente nativo");
      setUpdateState("error");
      return;
    }

    setUpdateState("downloading");
    setDownloadProgress(0);
    setErrorMessage("");

    try {
      bridge.startDownload(versionInfo.apkUrl);
    } catch (err: any) {
      setErrorMessage(err?.message || "Error al iniciar descarga");
      setUpdateState("error");
      return;
    }

    // Sondeo de estado de la descarga cada 500ms
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(() => {
      try {
        const rawStatus = bridge.getStatus();
        const statusObj: BridgeStatus =
          typeof rawStatus === "string" ? JSON.parse(rawStatus) : rawStatus;

        if (statusObj) {
          setDownloadProgress(statusObj.progress || 0);
          setBytesInfo({
            downloaded: statusObj.bytesDownloaded || 0,
            total: statusObj.totalBytes || 0,
          });

          if (statusObj.status === "completed") {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setUpdateState("completed");
          } else if (statusObj.status === "error") {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setErrorMessage(statusObj.error || "Ocurrió un error en la descarga");
            setUpdateState("error");
          }
        }
      } catch (err) {
        console.error("[AppUpdater] Error leyendo estado:", err);
      }
    }, 500);
  };

  // 5. Posponer actualización durante la sesión
  const postponeUpdate = () => {
    if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    if (versionInfo?.latestVersion) {
      sessionStorage.setItem(`tvshow_update_postponed_${versionInfo.latestVersion}`, "1");
    }
    setShowModal(false);
  };

  // 6. Abrir configuración de fuentes desconocidas si no está concedido
  const openPermissionSettings = () => {
    const bridge = (window as any).AndroidUpdater;
    if (bridge?.openInstallSettings) {
      bridge.openInstallSettings();
    }
  };

  // 7. Forzar relanzamiento del instalador si ya terminó
  const launchInstallerAgain = () => {
    const bridge = (window as any).AndroidUpdater;
    if (bridge?.installApk) {
      bridge.installApk();
    }
  };

  // Si no es nativo o no hay modal activo, no renderizar nada
  if (!isNative || !showModal || !versionInfo) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
    >
      <div className="bg-[#0e0f17] border-2 border-zinc-700/80 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl shadow-black/80 flex flex-col items-center text-center">
        {/* Icono animado */}
        <div className="w-16 h-16 rounded-full bg-[#008CFF]/15 border border-[#008CFF]/30 flex items-center justify-center mb-5 text-[#008CFF]">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
        </div>

        {/* Encabezado */}
        <h2 className="text-2xl font-bold text-white mb-2">
          ¡Nueva versión disponible!
        </h2>
        <div className="flex items-center gap-2 mb-4 text-sm font-medium">
          <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
            Instalada: v{currentVersion}
          </span>
          <span className="text-zinc-500">➔</span>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Nueva: v{versionInfo.latestVersion}
          </span>
        </div>

        {/* Estado 1: Cuenta regresiva / Pregunta */}
        {updateState === "countdown" && (
          <div className="w-full mb-6">
            <p className="text-zinc-300 text-sm mb-3">
              Hay una actualización importante disponible para TVShow.
            </p>

            {/* Aviso de cuenta regresiva */}
            {countdown !== null && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 mb-4 text-xs text-zinc-400">
                Se actualizará automáticamente en{" "}
                <span className="text-[#008CFF] font-bold text-base">{countdown}s</span>
              </div>
            )}

            {!canInstall && (
              <div className="bg-amber-950/40 border border-amber-600/40 rounded-xl p-3 mb-4 text-xs text-amber-300 text-left">
                <strong>Nota de permisos:</strong> Android solicitará autorizar la instalación de
                apps para TVShow. Puedes activarlo al abrir el instalador o en ajustes.
              </div>
            )}

            {/* Botones navegables con D-pad / Control Remoto */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center w-full mt-2">
              <button
                ref={primaryBtnRef}
                id="updater-primary-btn"
                onClick={startUpdate}
                className="flex-1 px-5 py-3 rounded-xl bg-[#008CFF] hover:bg-[#0077db] text-white font-semibold shadow-lg shadow-[#008CFF]/20 focus:outline-none focus:ring-4 focus:ring-[#008CFF] focus:border-white transition-all transform active:scale-95"
              >
                Actualizar ahora
              </button>
              <button
                onClick={postponeUpdate}
                className="px-5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium focus:outline-none focus:ring-4 focus:ring-zinc-500 transition-all transform active:scale-95"
              >
                Más tarde
              </button>
            </div>
          </div>
        )}

        {/* Estado 2: Descargando */}
        {updateState === "downloading" && (
          <div className="w-full mb-6">
            <p className="text-zinc-300 text-sm mb-4">
              Descargando archivo APK de actualización...
            </p>

            {/* Barra de progreso */}
            <div className="w-full bg-zinc-800 rounded-full h-4 overflow-hidden mb-2 border border-zinc-700">
              <div
                className="bg-gradient-to-r from-[#008CFF] to-emerald-400 h-full transition-all duration-300 rounded-full"
                style={{ width: `${Math.max(5, downloadProgress)}%` }}
              />
            </div>

            <div className="flex justify-between text-xs text-zinc-400 px-1 font-mono">
              <span>{downloadProgress}%</span>
              <span>
                {formatBytes(bytesInfo.downloaded)} / {formatBytes(bytesInfo.total)}
              </span>
            </div>

            <p className="text-xs text-zinc-500 mt-4 animate-pulse">
              No cierres la aplicación mientras se descarga la actualización.
            </p>
          </div>
        )}

        {/* Estado 3: Descarga completada */}
        {updateState === "completed" && (
          <div className="w-full mb-6 space-y-4">
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-300 text-sm">
              <p className="font-semibold mb-1">¡Descarga completada!</p>
              <p className="text-xs text-emerald-400/90">
                Se ha abierto el instalador de Android. Confirma la instalación en pantalla para
                completar la actualización.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center w-full">
              <button
                ref={primaryBtnRef}
                onClick={launchInstallerAgain}
                className="flex-1 px-5 py-3 rounded-xl bg-[#008CFF] text-white font-semibold focus:outline-none focus:ring-4 focus:ring-[#008CFF]"
              >
                Abrir instalador nuevamente
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-3 rounded-xl bg-zinc-800 text-zinc-300 font-medium focus:outline-none focus:ring-4 focus:ring-zinc-500"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* Estado 4: Error */}
        {updateState === "error" && (
          <div className="w-full mb-6 space-y-4">
            <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-300 text-sm text-left">
              <p className="font-semibold mb-1">Error al actualizar</p>
              <p className="text-xs text-rose-400">{errorMessage || "Ocurrió un error inesperado"}</p>
            </div>

            {!canInstall && (
              <button
                onClick={openPermissionSettings}
                className="w-full px-4 py-2 text-xs bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                Abrir Ajustes para permitir instalación
              </button>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center w-full">
              <button
                ref={primaryBtnRef}
                onClick={startUpdate}
                className="flex-1 px-5 py-3 rounded-xl bg-[#008CFF] text-white font-semibold focus:outline-none focus:ring-4 focus:ring-[#008CFF]"
              >
                Reintentar
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-3 rounded-xl bg-zinc-800 text-zinc-300 font-medium focus:outline-none focus:ring-4 focus:ring-zinc-500"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

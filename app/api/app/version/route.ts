import { NextResponse } from "next/server";
import pkg from "@/package.json";

export const dynamic = "force-dynamic";

interface VersionCache {
  data: {
    latestVersion: string;
    versionCode: number;
    tag: string;
    name: string;
    apkUrl: string;
    apkMobileUrl?: string;
    apkTvUrl?: string;
    exeUrl: string;
    windowsUrl?: string;
    releaseNotes: string;
    publishedAt: string;
  };
  expiresAt: number;
}

let cache: VersionCache | null = null;

function parseVersionCode(ver: string): number {
  try {
    const parts = ver.split(".");
    const major = parts.length > 0 ? parseInt(parts[0].replace(/[^0-9]/g, ""), 10) || 7 : 7;
    const minor = parts.length > 1 ? parseInt(parts[1].replace(/[^0-9]/g, ""), 10) || 0 : 0;
    const patch = parts.length > 2 ? parseInt(parts[2].replace(/[^0-9]/g, ""), 10) || 0 : 0;
    return major * 10000 + minor * 100 + patch;
  } catch {
    return 70000;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const isFresh = url.searchParams.get("fresh") === "1" || url.searchParams.get("nocache") === "1";
  const now = Date.now();

  if (!isFresh && cache && cache.expiresAt > now) {
    return NextResponse.json(cache.data, {
      headers: {
        "Cache-Control": "public, max-age=10, s-maxage=15, stale-while-revalidate=30",
      },
    });
  }

  const rawVer = String((pkg as any).version || "7.0.0");
  const parts = rawVer.split(".");
  const defaultVersion = parts.length >= 2 ? `${parts[0]}.${parts[1]}` : rawVer;
  const fallbackApkUrl = `https://github.com/bryanfrank99/tvshowapp/releases/download/v${defaultVersion}/TVShow-Mobile-v${defaultVersion}.apk`;
  const fallbackTvApkUrl = `https://github.com/bryanfrank99/tvshowapp/releases/download/v${defaultVersion}/TVShow-TV-v${defaultVersion}.apk`;
  const fallbackExeUrl = `https://github.com/bryanfrank99/tvshowapp/releases/download/v${defaultVersion}/TVShow-Setup-${defaultVersion}.exe`;

  try {
    const res = await fetch("https://api.github.com/repos/bryanfrank99/tvshowapp/releases/latest", {
      headers: {
        "User-Agent": "TVShow-AutoUpdater",
        Accept: "application/vnd.github.v3+json",
      },
      next: { revalidate: isFresh ? 0 : 15 },
    });

    if (!res.ok) {
      throw new Error(`GitHub API HTTP ${res.status}`);
    }

    const release = await res.json();
    const tag = release.tag_name || `v${defaultVersion}`;
    const cleanVersion = tag.replace(/^v/i, "");

    // Buscar APK (Mobile/TV) y EXE dentro de los assets publicados
    let apkUrl = fallbackApkUrl;
    let apkMobileUrl = fallbackApkUrl;
    let apkTvUrl = fallbackTvApkUrl;
    let exeUrl = fallbackExeUrl;
    if (Array.isArray(release.assets)) {
      const mobileAsset = release.assets.find(
        (a: any) => typeof a.name === "string" && a.name.toLowerCase().includes("mobile") && a.name.toLowerCase().endsWith(".apk")
      );
      const tvAsset = release.assets.find(
        (a: any) => typeof a.name === "string" && (a.name.includes("-TV-") || a.name.toLowerCase().includes("tvshow-tv")) && a.name.toLowerCase().endsWith(".apk")
      );
      const anyApkAsset = release.assets.find(
        (a: any) => typeof a.name === "string" && a.name.toLowerCase().endsWith(".apk")
      );

      if (mobileAsset?.browser_download_url) {
        apkMobileUrl = mobileAsset.browser_download_url;
      }
      if (tvAsset?.browser_download_url) {
        apkTvUrl = tvAsset.browser_download_url;
      }
      apkUrl = (mobileAsset || anyApkAsset)?.browser_download_url || fallbackApkUrl;

      const exeAsset = release.assets.find(
        (a: any) => typeof a.name === "string" && a.name.toLowerCase().endsWith(".exe")
      );
      if (exeAsset?.browser_download_url) {
        exeUrl = exeAsset.browser_download_url;
      }
    }

    const cleanCode = parseVersionCode(cleanVersion);

    const data = {
      latestVersion: cleanVersion,
      versionCode: cleanCode,
      tag,
      name: release.name || `TVShow ${tag}`,
      apkUrl,
      apkMobileUrl,
      apkTvUrl,
      exeUrl,
      windowsUrl: exeUrl,
      releaseNotes: "",
      publishedAt: release.published_at || new Date().toISOString(),
    };

    cache = { data, expiresAt: now + 15 * 1000 };

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": isFresh
          ? "no-store, no-cache, must-revalidate"
          : "public, max-age=10, s-maxage=15, stale-while-revalidate=30",
      },
    });
  } catch (err: any) {
    const fallbackData = {
      latestVersion: defaultVersion,
      versionCode: parseVersionCode(defaultVersion),
      tag: `v${defaultVersion}`,
      name: `TVShow v${defaultVersion}`,
      apkUrl: fallbackApkUrl,
      apkMobileUrl: fallbackApkUrl,
      apkTvUrl: fallbackTvApkUrl,
      exeUrl: fallbackExeUrl,
      windowsUrl: fallbackExeUrl,
      releaseNotes: "",
      publishedAt: new Date().toISOString(),
      fallback: true,
      error: err?.message || "Error conectando a GitHub Releases",
    };
    return NextResponse.json(fallbackData);
  }
}

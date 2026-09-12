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
    releaseNotes: string;
    publishedAt: string;
  };
  expiresAt: number;
}

let cache: VersionCache | null = null;

export async function GET() {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return NextResponse.json(cache.data, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  }

  const defaultVersion = String((pkg as any).version || "5.60");
  const fallbackApkUrl = `https://github.com/bryanfrank99/tvshowapp/releases/download/v${defaultVersion}/TVShow-v${defaultVersion}.apk`;

  try {
    const res = await fetch("https://api.github.com/repos/bryanfrank99/tvshowapp/releases/latest", {
      headers: {
        "User-Agent": "TVShow-AutoUpdater",
        Accept: "application/vnd.github.v3+json",
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      throw new Error(`GitHub API HTTP ${res.status}`);
    }

    const release = await res.json();
    const tag = release.tag_name || `v${defaultVersion}`;
    const cleanVersion = tag.replace(/^v/i, "");

    // Buscar el APK dentro de los assets publicados
    let apkUrl = fallbackApkUrl;
    if (Array.isArray(release.assets)) {
      const apkAsset = release.assets.find(
        (a: any) => typeof a.name === "string" && a.name.toLowerCase().endsWith(".apk")
      );
      if (apkAsset?.browser_download_url) {
        apkUrl = apkAsset.browser_download_url;
      }
    }

    const cleanCode = parseInt(cleanVersion.replace(/[^0-9]/g, ""), 10) || 560;

    const data = {
      latestVersion: cleanVersion,
      versionCode: cleanCode,
      tag,
      name: release.name || `TVShow ${tag}`,
      apkUrl,
      releaseNotes: release.body || "",
      publishedAt: release.published_at || new Date().toISOString(),
    };

    cache = { data, expiresAt: now + 5 * 60 * 1000 };

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (err: any) {
    const fallbackData = {
      latestVersion: defaultVersion,
      versionCode: parseInt(defaultVersion.replace(/[^0-9]/g, ""), 10) || 560,
      tag: `v${defaultVersion}`,
      name: `TVShow v${defaultVersion}`,
      apkUrl: fallbackApkUrl,
      releaseNotes: "",
      publishedAt: new Date().toISOString(),
      fallback: true,
      error: err?.message || "Error conectando a GitHub Releases",
    };
    return NextResponse.json(fallbackData);
  }
}

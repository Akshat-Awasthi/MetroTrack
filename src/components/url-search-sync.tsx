"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { findJourneyRoute } from "@/lib/utils";
import { stations } from "@/lib/delhi-metro-data";
import type { Station } from "@/types";

type Props = {
  fromStationId: string | null;
  setFromStationId: (id: string | null) => void;
  toStationId: string | null;
  setToStationId: (id: string | null) => void;
  journey: { from: Station; to: Station; route: Station[] } | null;
  setJourney: (j: { from: Station; to: Station; route: Station[] } | null) => void;
  scale: number;
  setScale: (s: number) => void;
  translate: { x: number; y: number };
  setTranslate: (t: { x: number; y: number }) => void;
};

export default function UrlSearchSync({
  fromStationId,
  setFromStationId,
  toStationId,
  setToStationId,
  journey,
  setJourney,
  scale,
  setScale,
  translate,
  setTranslate,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const transformSyncTimerRef = React.useRef<number | null>(null);
  const [urlInitialized, setUrlInitialized] = React.useState(false);

  // Initialize state from URL search params when they change (or on first load)
  React.useEffect(() => {
    if (!searchParams) return;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const journeyParam = searchParams.get("journey");
    const scaleParam = searchParams.get("scale");
    const txParam = searchParams.get("tx");
    const tyParam = searchParams.get("ty");

    if (from && from !== fromStationId) setFromStationId(from);
    if (to && to !== toStationId) setToStationId(to);

    // Restore map transform if present
    if (scaleParam) {
      const parsed = parseFloat(scaleParam);
      if (!Number.isNaN(parsed)) setScale(parsed);
    }
    if (txParam && tyParam) {
      const x = parseFloat(txParam);
      const y = parseFloat(tyParam);
      if (!Number.isNaN(x) && !Number.isNaN(y)) setTranslate({ x, y });
    }

    // If journey param is present and we have from+to, start journey state
    if (journeyParam === "1" && from && to && !journey) {
      const route = findJourneyRoute(from, to);
      if (route) {
        setJourney({ from: stations[from], to: stations[to], route });
      }
    }

    // If journey param is absent, ensure we don't stay in journey
    if (journeyParam !== "1" && journey) {
      setJourney(null);
    }

    // Mark that we've initialized from URL so the sync effect doesn't stomp incoming params
    setUrlInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Reflect changes in important state back to the URL. We avoid noisy updates by
  // throttling map transform updates and only pushing when values differ.
  React.useEffect(() => {
    if (!router || !pathname) return;
    if (!urlInitialized) return;

    const currentFrom = searchParams?.get("from");
    const currentTo = searchParams?.get("to");
    const currentJourney = searchParams?.get("journey");
    const currentScale = searchParams?.get("scale");
    const currentTx = searchParams?.get("tx");
    const currentTy = searchParams?.get("ty");

    const needsImmediateReplace = (
      (fromStationId || "") !== (currentFrom || "") ||
      (toStationId || "") !== (currentTo || "") ||
      ((journey ? "1" : "") !== (currentJourney || ""))
    );

    // Build base params (from/to/journey)
    const baseParams = new URLSearchParams();
    if (fromStationId) baseParams.set("from", fromStationId);
    if (toStationId) baseParams.set("to", toStationId);
    if (journey) baseParams.set("journey", "1");

    // If base params differ from URL, replace immediately (this handles selections/start/end)
    if (needsImmediateReplace) {
      // Keep current transform params from URL (so we don't drop them unintentionally)
      if (currentScale) baseParams.set("scale", currentScale);
      if (currentTx) baseParams.set("tx", currentTx);
      if (currentTy) baseParams.set("ty", currentTy);
      const newUrl = pathname + (baseParams.toString() ? `?${baseParams.toString()}` : "");
      router.replace(newUrl);
    }

    // Throttle transform updates so panning/zooming doesn't flood history/navigation
    if (transformSyncTimerRef.current) {
      window.clearTimeout(transformSyncTimerRef.current);
    }
    transformSyncTimerRef.current = window.setTimeout(() => {
      const transformParams = new URLSearchParams(baseParams.toString());
      transformParams.set("scale", String(scale));
      transformParams.set("tx", String(translate.x));
      transformParams.set("ty", String(translate.y));

      // Only replace if something is different
      const changed = (
        transformParams.get("scale") !== currentScale ||
        transformParams.get("tx") !== currentTx ||
        transformParams.get("ty") !== currentTy ||
        needsImmediateReplace
      );
      if (changed) {
        const newUrl = pathname + (transformParams.toString() ? `?${transformParams.toString()}` : "");
        router.replace(newUrl);
      }
    }, 250) as unknown as number;

    return () => {
      if (transformSyncTimerRef.current) {
        window.clearTimeout(transformSyncTimerRef.current);
        transformSyncTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromStationId, toStationId, journey, scale, translate, urlInitialized]);

  return null;
}

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  leftNode?: React.ReactNode;
  initialHeightVh?: number; // starting height in vh
  minHeightVh?: number;
  maxHeightVh?: number;
  snapPoints?: number[]; // optional snap points in vh
  children?: React.ReactNode;
  className?: string;
};

export default function BottomMenu({ title, leftNode, initialHeightVh = 25, minHeightVh = 20, maxHeightVh = 100, snapPoints = [25, 60, 100], children, className }: Props) {
  const [heightVh, setHeightVh] = React.useState<number>(initialHeightVh);
  const resizingRef = React.useRef(false);
  const startYRef = React.useRef(0);
  const startHeightRef = React.useRef(initialHeightVh);
  const [isTransitioning, setIsTransitioning] = React.useState(false);

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    resizingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = heightVh;
    // while dragging, disable transitions so movement feels immediate
    setIsTransitioning(false);
    window.addEventListener('pointermove', onPointerMove as any);
    window.addEventListener('pointerup', onPointerUp as any);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (ev: PointerEvent) => {
    if (!resizingRef.current) return;
    const deltaY = startYRef.current - ev.clientY; // positive when dragging up
    const deltaVh = (deltaY / window.innerHeight) * 100;
    const next = clamp(startHeightRef.current + deltaVh, minHeightVh, maxHeightVh);
    setHeightVh(next);
  };

  const onPointerUp = () => {
    resizingRef.current = false;
    window.removeEventListener('pointermove', onPointerMove as any);
    window.removeEventListener('pointerup', onPointerUp as any);
    // On release, snap to the nearest allowed snap point (within min/max)
    const candidates = snapPoints
      .filter(p => p >= minHeightVh && p <= maxHeightVh)
      .sort((a, b) => a - b);
    if (candidates.length > 0) {
      let closest = candidates[0];
      let bestDist = Math.abs(heightVh - closest);
      for (const p of candidates) {
        const d = Math.abs(heightVh - p);
        if (d < bestDist) {
          bestDist = d;
          closest = p;
        }
      }
      // animate to snapped value
      setIsTransitioning(true);
      setHeightVh(closest);
      // clear transitioning flag after animation completes
      window.setTimeout(() => setIsTransitioning(false), 300);
    }
  };

  React.useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', onPointerMove as any);
      window.removeEventListener('pointerup', onPointerUp as any);
    };
  }, []);

  return (
    <div
      aria-hidden={false}
      className={cn("fixed left-0 right-0 bottom-0 z-40 rounded-t-lg shadow-xl bg-background/95 backdrop-blur-sm overflow-hidden", className)}
      style={{ height: `${heightVh}vh`, transition: isTransitioning ? 'height 260ms cubic-bezier(.22,.9,.27,1)' : 'none' }}
    >
      <div className="p-3 pt-2 text-center relative">
        <div
          className="mx-auto h-1.5 w-12 rounded-full bg-muted-foreground/20 mb-2 touch-none select-none"
          onPointerDown={onPointerDown}
          style={{ cursor: 'grab' }}
          role="button"
          aria-label="Resize bottom menu"
        />
        {title && <h3 className="text-lg font-semibold">{title}</h3>}
  {leftNode && <div className="absolute left-4 top-4">{leftNode}</div>}
      </div>

      <div className="h-[calc(100%-56px)] overflow-y-auto">{children}</div>
    </div>
  );
}

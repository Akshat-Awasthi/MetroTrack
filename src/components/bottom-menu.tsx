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
  const [isDragging, setIsDragging] = React.useState(false);
  const dirLockedRef = React.useRef<"up" | "down" | null>(null);
  const DIRECTION_THRESHOLD_VH = 1.5;

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Begin drag session
    resizingRef.current = true;
    setIsDragging(true);
    dirLockedRef.current = null;
    startYRef.current = e.clientY;
    startHeightRef.current = heightVh;
    // while dragging, disable transitions so movement feels immediate
    setIsTransitioning(false);
    // prevent the page from scrolling while dragging on mobile
    try {
      (document.body as HTMLBodyElement).style.overflow = 'hidden';
    } catch (e) {}
    // Use non-passive listener so we can call preventDefault in move if needed
    window.addEventListener('pointermove', onPointerMove as any, { passive: false } as any);
    window.addEventListener('pointerup', onPointerUp as any);
    // Capture pointer to this target so moves outside the handle still report
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch (err) {}
  };

  const onPointerMove = (ev: PointerEvent) => {
    if (!resizingRef.current) return;
    // prevent default to stop touch scrolling while dragging
    try { ev.preventDefault(); } catch (e) {}
    const deltaY = startYRef.current - ev.clientY; // positive when dragging up
    const deltaVh = (deltaY / window.innerHeight) * 100;
    // Immediate directional lock: if user moves up beyond threshold, expand to full
    // screen immediately; if user moves down beyond threshold, collapse to initial.
    if (dirLockedRef.current === null) {
      if (deltaVh > DIRECTION_THRESHOLD_VH) {
        dirLockedRef.current = "up";
        setIsTransitioning(true);
        setHeightVh(maxHeightVh);
        return;
      }
      if (deltaVh < -DIRECTION_THRESHOLD_VH) {
        dirLockedRef.current = "down";
        setIsTransitioning(true);
        setHeightVh(initialHeightVh);
        return;
      }
    }
    // If direction already locked, don't follow fine-grained moves to avoid flicker
    if (dirLockedRef.current) return;
    const next = clamp(startHeightRef.current + deltaVh, minHeightVh, maxHeightVh);
    setHeightVh(next);
  };

  const onPointerUp = () => {
    resizingRef.current = false;
    setIsDragging(false);
    window.removeEventListener('pointermove', onPointerMove as any);
    window.removeEventListener('pointerup', onPointerUp as any);
    try {
      (document.body as HTMLBodyElement).style.overflow = '';
    } catch (e) {}
    // If direction locked during move, ensure final state reflects the locked direction
    if (dirLockedRef.current === "up") {
      setIsTransitioning(true);
      setHeightVh(maxHeightVh);
      window.setTimeout(() => setIsTransitioning(false), 300);
      dirLockedRef.current = null;
      return;
    }
    if (dirLockedRef.current === "down") {
      setIsTransitioning(true);
      setHeightVh(initialHeightVh);
      window.setTimeout(() => setIsTransitioning(false), 300);
      dirLockedRef.current = null;
      return;
    }
    // Fallback behavior: small move - snap to nearest sensible state
    const deltaVh = heightVh - startHeightRef.current;
    const THRESHOLD = 2; // in vh
    let target = initialHeightVh;
    if (deltaVh > THRESHOLD) {
      target = maxHeightVh;
    } else if (deltaVh < -THRESHOLD) {
      target = initialHeightVh;
    } else {
      const distToInitial = Math.abs(heightVh - initialHeightVh);
      const distToMax = Math.abs(heightVh - maxHeightVh);
      target = distToInitial <= distToMax ? initialHeightVh : maxHeightVh;
    }
    setIsTransitioning(true);
    setHeightVh(clamp(target, minHeightVh, maxHeightVh));
    window.setTimeout(() => setIsTransitioning(false), 300);
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
      className={cn("fixed left-0 right-0 bottom-0 z-40 rounded-t-lg shadow-xl bg-background overflow-hidden", className)}
      style={{ height: `${heightVh}vh`, transition: isTransitioning ? 'height 260ms cubic-bezier(.22,.9,.27,1)' : 'none', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="p-3 pt-2 text-center relative">
        <div
          className="mx-auto h-1.5 w-12 rounded-full bg-muted-foreground/20 mb-2 select-none"
          onPointerDown={onPointerDown}
          style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
          role="button"
          aria-label="Resize bottom menu"
        />
        {title && <h3 className="text-lg font-semibold">{title}</h3>}
  {leftNode && <div className="absolute left-4 top-4">{leftNode}</div>}
      </div>

      <div className="overflow-y-auto" style={{ height: 'calc(100% - 56px)', paddingBottom: 'env(safe-area-inset-bottom)' }}>{children}</div>
    </div>
  );
}

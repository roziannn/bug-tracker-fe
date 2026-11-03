"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { SPOT_PADDING, computeTipPosition } from "@/components/shared/tour-position";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TourStep = {
  /** Nilai atribut data-tour pada elemen yang disorot. */
  target: string;
  title: string;
  content: string;
};

function findTarget(target: string) {
  return document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
}

/**
 * Product tour: menyorot satu bagian halaman sekaligus dengan penjelasan singkat.
 * Dipasang hanya saat tour berjalan (render komponen ini = mulai dari langkah pertama).
 */
export function GuidedTour({ steps, onClose }: { steps: TourStep[]; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const nextRef = useRef<HTMLButtonElement>(null);

  const step = steps[index];
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  // Ukur ulang elemen yang disorot setiap langkah, dan saat halaman di-scroll atau ukuran jendela berubah.
  useEffect(() => {
    const element = findTarget(step.target);
    let frame = 0;

    const measure = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      setRect(element ? element.getBoundingClientRect() : null);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    element?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    schedule();

    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
    };
  }, [step.target]);

  // Fokus ke tombol berikutnya supaya Enter langsung melanjutkan.
  useEffect(() => {
    nextRef.current?.focus();
  }, [index]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") setIndex((current) => Math.min(current + 1, steps.length - 1));
      if (event.key === "ArrowLeft") setIndex((current) => Math.max(current - 1, 0));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, steps.length]);

  // Belum diukur (render pertama): kotak penjelasan belum ditampilkan.
  const tip = viewport.width > 0 ? computeTipPosition(rect, viewport) : null;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[70]" role="presentation">
      {/* Menahan klik ke halaman selama tour berjalan */}
      <div className="absolute inset-0" />

      {rect ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-xl ring-2 ring-primary shadow-[0_0_0_9999px_rgba(2,6,23,0.62)] transition-all duration-300 ease-out"
          style={{
            top: rect.top - SPOT_PADDING,
            left: rect.left - SPOT_PADDING,
            width: rect.width + SPOT_PADDING * 2,
            height: rect.height + SPOT_PADDING * 2,
          }}
        >
          {/* Titik penunjuk yang berdenyut di sudut sorotan */}
          <span className="absolute -top-1.5 -left-1.5 flex size-3.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex size-3.5 rounded-full bg-primary ring-2 ring-background" />
          </span>
        </div>
      ) : (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-slate-950/60" />
      )}

      {tip ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-title"
          className="absolute rounded-xl border bg-popover p-4 text-popover-foreground shadow-xl transition-[top,bottom,left] duration-300 ease-out"
          style={{ top: tip.top, bottom: tip.bottom, left: tip.left, width: tip.width }}
        >
          {tip.arrow ? (
            <span
              aria-hidden="true"
              className={cn(
                "absolute size-3 rotate-45 border bg-popover",
                tip.arrow === "top" ? "-top-1.5 border-r-0 border-b-0" : "-bottom-1.5 border-t-0 border-l-0"
              )}
              style={{ left: tip.arrowLeft }}
            />
          ) : null}

          <p className="text-xs font-medium text-muted-foreground">
            Step {index + 1} of {steps.length}
          </p>
          <h3 id="tour-title" className="mt-1 text-base font-semibold">
            {step.title}
          </h3>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{step.content}</p>

          <div className="mt-4 flex items-center justify-between gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Skip tour
            </Button>
            <div className="flex items-center gap-2">
              {!isFirst ? (
                <Button type="button" variant="outline" size="sm" onClick={() => setIndex((current) => current - 1)}>
                  Back
                </Button>
              ) : null}
              <Button
                ref={nextRef}
                type="button"
                size="sm"
                onClick={() => (isLast ? onClose() : setIndex((current) => current + 1))}
              >
                {isLast ? "Done" : "Next"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>,
    document.body
  );
}

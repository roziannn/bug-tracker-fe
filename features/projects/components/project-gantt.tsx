"use client";

import { useMemo, useState, type PointerEvent } from "react";

import { DAY_MS, formatDate, formatMonthYear, parseDateOnly, toDateOnly, todayDateOnly } from "@/lib/date";

export type TimelinePhase = {
  id: string;
  name: string;
  /** Format YYYY-MM-DD */
  start: string;
  end: string;
};

// Lebih dari ini chart jadi terlalu lebar untuk dibaca, biasanya karena salah ketik tahun.
const MAX_MONTHS = 48;
const LABEL_WIDTH = "11rem";
const ROW_HEIGHT = "h-9";
const DAY_WIDTH = 18;

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

type Bar = { id: string; name: string; start: number; end: number; color: string };

function monthStart(ms: number) {
  const date = new Date(ms);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

function nextMonthStart(ms: number) {
  const date = new Date(ms);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
}

// Gantt chart sederhana: satu baris per phase, sumbu waktu dibagi per bulan. Hanya menerima phase yang sudah valid.
export function ProjectGantt({
  phases,
  emptyMessage = "Add a phase with a start and end date to see the Gantt chart.",
  onPhaseMove,
  savingPhaseId = null,
}: {
  phases: TimelinePhase[];
  emptyMessage?: string;
  onPhaseMove?: (phaseId: string, start: string, end: string) => void;
  savingPhaseId?: string | null;
}) {
  const [drag, setDrag] = useState<{ id: string; startX: number; offsetDays: number } | null>(null);
  const chart = useMemo(() => {
    const bars: Bar[] = [];
    phases.forEach((phase, index) => {
      const start = parseDateOnly(phase.start);
      const end = parseDateOnly(phase.end);
      if (start === null || end === null || end < start) return;
      bars.push({ id: phase.id, name: phase.name, start, end, color: CHART_COLORS[index % CHART_COLORS.length] });
    });
    if (!bars.length) return null;

    const first = Math.min(...bars.map((bar) => bar.start));
    const last = Math.max(...bars.map((bar) => bar.end));
    const rangeStart = monthStart(first);
    const rangeEnd = nextMonthStart(last);
    const totalDays = (rangeEnd - rangeStart) / DAY_MS;

    const months: { label: string; start: number; days: number }[] = [];
    for (let cursor = rangeStart; cursor < rangeEnd; cursor = nextMonthStart(cursor)) {
      months.push({ label: formatMonthYear(cursor), start: cursor, days: (nextMonthStart(cursor) - cursor) / DAY_MS });
    }

    return { bars, first, last, rangeStart, rangeEnd, totalDays, months };
  }, [phases]);

  if (!chart) {
    return (
      <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  if (chart.months.length > MAX_MONTHS) {
    return (
      <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
        The timeline spans more than {MAX_MONTHS / 12} years. Check the dates to see the Gantt chart.
      </p>
    );
  }

  const dayOffset = (ms: number) => ((ms - chart.rangeStart) / DAY_MS) * DAY_WIDTH;
  const today = todayDateOnly();
  const showToday = today >= chart.rangeStart && today < chart.rangeEnd;
  const projectDays = (chart.last - chart.first) / DAY_MS + 1;
  const timelineWidth = Math.max(704, chart.totalDays * DAY_WIDTH);

  function startDrag(event: PointerEvent<HTMLDivElement>, bar: Bar) {
    if (!onPhaseMove || savingPhaseId) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ id: bar.id, startX: event.clientX, offsetDays: 0 });
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    setDrag({ ...drag, offsetDays: Math.round((event.clientX - drag.startX) / DAY_WIDTH) });
  }

  function finishDrag() {
    if (!drag) return;
    if (!chart) {
      setDrag(null);
      return;
    }
    const bar = chart.bars.find((item) => item.id === drag.id);
    if (bar && drag.offsetDays !== 0 && onPhaseMove) {
      const shift = drag.offsetDays * DAY_MS;
      onPhaseMove(bar.id, toDateOnly(bar.start + shift), toDateOnly(bar.end + shift));
    }
    setDrag(null);
  }

  function moveByKeyboard(bar: Bar, offsetDays: number) {
    if (!onPhaseMove || savingPhaseId) return;
    const shift = offsetDays * DAY_MS;
    onPhaseMove(bar.id, toDateOnly(bar.start + shift), toDateOnly(bar.end + shift));
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">
        {formatDate(toDateOnly(chart.first))} - {formatDate(toDateOnly(chart.last))} · {projectDays}{" "}
        {projectDays === 1 ? "day" : "days"} · {chart.bars.length} {chart.bars.length === 1 ? "phase" : "phases"}
      </p>

      <div className="overflow-x-auto rounded-lg border" role="img" aria-label="Project timeline Gantt chart">
        <div className="grid" style={{ gridTemplateColumns: `${LABEL_WIDTH} ${timelineWidth}px` }}>
          <div className="border-r bg-card">
            <div className={`${ROW_HEIGHT} border-b`} />
            {chart.bars.map((bar) => (
              <div key={bar.id} className={`flex ${ROW_HEIGHT} items-center gap-2 border-b px-3 text-sm last:border-b-0`}>
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: bar.color }} />
                <span className="truncate" title={bar.name}>
                  {bar.name}
                </span>
              </div>
            ))}
          </div>

          <div className="relative">
            <div className={`flex ${ROW_HEIGHT} border-b`}>
              {chart.months.map((month) => (
                <div
                  key={month.start}
                  className="overflow-hidden px-2 text-xs leading-9 whitespace-nowrap text-muted-foreground"
                  style={{ width: `${month.days * DAY_WIDTH}px` }}
                >
                  {month.label}
                </div>
              ))}
            </div>

            {chart.bars.map((bar) => {
              const days = (bar.end - bar.start) / DAY_MS + 1;
              const label = `${bar.name}: ${formatDate(toDateOnly(bar.start))} - ${formatDate(toDateOnly(bar.end))} (${days} ${days === 1 ? "day" : "days"})`;
              const offsetDays = drag?.id === bar.id ? drag.offsetDays : 0;
              const shiftedStart = bar.start + offsetDays * DAY_MS;
              const disabled = !onPhaseMove || savingPhaseId !== null;

              return (
                <div key={bar.id} className={`relative ${ROW_HEIGHT} border-b last:border-b-0`}>
                  <div
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    aria-label={`${label}. Drag to shift dates, or use left and right arrow keys.`}
                    aria-disabled={disabled}
                    aria-grabbed={drag?.id === bar.id}
                    onPointerDown={(event) => startDrag(event, bar)}
                    onPointerMove={moveDrag}
                    onPointerUp={finishDrag}
                    onPointerCancel={() => setDrag(null)}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowLeft") {
                        event.preventDefault();
                        moveByKeyboard(bar, -1);
                      }
                      if (event.key === "ArrowRight") {
                        event.preventDefault();
                        moveByKeyboard(bar, 1);
                      }
                    }}
                    className={`absolute top-1.5 bottom-1.5 min-w-1.5 rounded-md shadow-sm select-none touch-none ${disabled ? "cursor-default" : "cursor-grab active:cursor-grabbing"} ${drag?.id === bar.id ? "z-10 ring-2 ring-foreground/40" : ""}`}
                    style={{
                      left: `${dayOffset(shiftedStart)}px`,
                      width: `${days * DAY_WIDTH}px`,
                      backgroundColor: bar.color,
                    }}
                    title={label}
                  />
                </div>
              );
            })}

            {/* Garis pemisah bulan */}
            {chart.months.slice(1).map((month) => (
              <span
                key={month.start}
                aria-hidden="true"
                className="pointer-events-none absolute top-0 bottom-0 w-px bg-border"
                style={{ left: `${dayOffset(month.start)}px` }}
              />
            ))}

            {showToday ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-0 bottom-0 w-px bg-destructive"
                style={{ left: `${dayOffset(today + DAY_MS / 2)}px` }}
              >
                <span className="absolute top-0.5 left-1/2 -translate-x-1/2 rounded bg-destructive px-1 text-[10px] leading-4 text-white">
                  Today
                </span>
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

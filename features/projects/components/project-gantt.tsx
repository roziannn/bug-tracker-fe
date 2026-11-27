"use client";

import { useMemo, useState, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";

import { DAY_MS, formatDate, formatMonthYear, parseDateOnly, toDateOnly, todayDateOnly } from "@/lib/date";

export type TimelinePhase = {
  id: string;
  name: string;
  /** Format YYYY-MM-DD */
  start: string;
  end: string;
  actualStart?: string;
  actualEnd?: string;
};

// Lebih dari ini chart jadi terlalu lebar untuk dibaca, biasanya karena salah ketik tahun.
const MAX_MONTHS = 48;
const LABEL_WIDTH = "11rem";
const ROW_HEIGHT = "h-9";
const DAY_WIDTH = 18;

type Bar = { id: string; name: string; track: "Plan" | "Actual"; start: number; end: number; color: string; visible: boolean };

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
    phases.forEach((phase) => {
      const start = parseDateOnly(phase.start);
      const end = parseDateOnly(phase.end);
      if (start === null || end === null || end < start) return;
      bars.push({ id: phase.id, name: phase.name, track: "Plan", start, end, color: "#eab308", visible: true });
      const actualStart = parseDateOnly(phase.actualStart ?? "");
      const actualEnd = parseDateOnly(phase.actualEnd ?? "");
      const hasActualDates = actualStart !== null && actualEnd !== null && actualEnd >= actualStart;
      bars.push({
        id: `${phase.id}-actual`,
        name: phase.name,
        track: "Actual",
        start: hasActualDates ? actualStart : start,
        end: hasActualDates ? actualEnd : end,
        color: "#22c55e",
        visible: hasActualDates,
      });
    });
    if (!bars.length) return null;

    const first = Math.min(...bars.map((bar) => bar.start));
    const last = Math.max(...bars.map((bar) => bar.end));
    const rangeStart = monthStart(first);
    const rangeEnd = nextMonthStart(last);
    const totalDays = (rangeEnd - rangeStart) / DAY_MS;

    const months: { label: string; start: number; days: number; weeks: { number: number; days: number }[] }[] = [];
    for (let cursor = rangeStart; cursor < rangeEnd; cursor = nextMonthStart(cursor)) {
      const days = (nextMonthStart(cursor) - cursor) / DAY_MS;
      const firstDayOfWeek = new Date(cursor).getUTCDay();
      const firstWeekDays = firstDayOfWeek === 0 ? 1 : 8 - firstDayOfWeek;
      const weeks: { number: number; days: number }[] = [];
      let remainingDays = days;
      let weekNumber = 1;
      while (remainingDays > 0) {
        const weekDays = weekNumber === 1 ? Math.min(firstWeekDays, remainingDays) : Math.min(7, remainingDays);
        weeks.push({ number: weekNumber++, days: weekDays });
        remainingDays -= weekDays;
      }
      months.push({ label: formatMonthYear(cursor), start: cursor, days, weeks });
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
  const phaseCount = chart.bars.filter((bar) => bar.track === "Plan").length;
  const timelineWidth = Math.max(704, chart.totalDays * DAY_WIDTH);

  function startDrag(event: PointerEvent<HTMLDivElement>, bar: Bar) {
    if (!onPhaseMove || savingPhaseId || bar.track !== "Plan") return;
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
    if (!onPhaseMove || savingPhaseId || bar.track !== "Plan") return;
    const shift = offsetDays * DAY_MS;
    onPhaseMove(bar.id, toDateOnly(bar.start + shift), toDateOnly(bar.end + shift));
  }

  function makeSvg() {
    const labelWidth = 176;
    const headerHeight = 52;
    const rowHeight = 36;
    const width = labelWidth + timelineWidth;
    const height = headerHeight + chart.bars.length * rowHeight;
    const dark = document.documentElement.classList.contains("dark");
    const background = dark ? "#161b22" : "#ffffff";
    const foreground = dark ? "#e5e7eb" : "#1f2937";
    const muted = dark ? "#9ca3af" : "#6b7280";
    const border = dark ? "#30363d" : "#d1d5db";
    const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]!);
    const text = (x: number, y: number, value: string, size = 12, fill = muted) =>
      `<text x="${x}" y="${y}" fill="${fill}" font-family="Arial, sans-serif" font-size="${size}">${escape(value)}</text>`;

    let headers = "";
    headers += `<rect x="0" y="0" width="${labelWidth}" height="${headerHeight}" fill="${background}" stroke="${border}"/>`;
    headers += text(12, 30, "Phase", 12, foreground);
    let offset = 0;
    for (const month of chart.months) {
      const monthWidth = month.days * DAY_WIDTH;
      headers += `<rect x="${labelWidth + offset}" y="0" width="${monthWidth}" height="28" fill="${background}" stroke="${border}"/>`;
      headers += text(labelWidth + offset + 8, 18, month.label);
      let weekOffset = 0;
      for (const week of month.weeks) {
        const weekWidth = week.days * DAY_WIDTH;
        headers += `<rect x="${labelWidth + offset + weekOffset}" y="28" width="${weekWidth}" height="24" fill="${background}" stroke="${border}"/>`;
        headers += text(labelWidth + offset + weekOffset + 4, 44, week.days >= 5 ? `Week ${week.number}` : `W${week.number}`, 10);
        weekOffset += weekWidth;
      }
      offset += monthWidth;
    }

    const rows = chart.bars.map((bar, index) => {
      const y = headerHeight + index * rowHeight;
      const row = `<rect x="0" y="${y}" width="${width}" height="${rowHeight}" fill="${background}" stroke="${border}"/>`;
      const name = bar.track === "Plan" ? text(26, y + rowHeight + 4, bar.name, 12, foreground) : "";
      if (!bar.visible) return row + name;
      const x = labelWidth + dayOffset(bar.start);
      const barY = y + 7;
      const barWidth = ((bar.end - bar.start) / DAY_MS + 1) * DAY_WIDTH;
      const rect = `<rect x="${x}" y="${barY}" width="${barWidth}" height="22" rx="8" fill="${bar.color}"/>`;
      return row + name + rect;
    }).join("");

    const todayLine = showToday
      ? `<line x1="${labelWidth + dayOffset(today + DAY_MS / 2)}" y1="0" x2="${labelWidth + dayOffset(today + DAY_MS / 2)}" y2="${height}" stroke="#ef4444"/><text x="${labelWidth + dayOffset(today + DAY_MS / 2) + 4}" y="12" fill="#ef4444" font-family="Arial, sans-serif" font-size="10">Today</text>`
      : "";
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${background}"/><g>${headers}${rows}${todayLine}</g></svg>`;
  }

  function downloadSvg() {
    const blob = new Blob([makeSvg()], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "project-gantt.svg";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadPng() {
    const svgBlob = new Blob([makeSvg()], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, 12000 / image.width, 12000 / image.height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext("2d");
      context?.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const pngUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = pngUrl;
        link.download = "project-gantt.png";
        link.click();
        URL.revokeObjectURL(pngUrl);
      }, "image/png");
    };
    image.onerror = () => URL.revokeObjectURL(url);
    image.src = url;
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {formatDate(toDateOnly(chart.first))} - {formatDate(toDateOnly(chart.last))} · {projectDays}{" "}
          {projectDays === 1 ? "day" : "days"} · {phaseCount} {phaseCount === 1 ? "phase" : "phases"}
        </p>
        <details className="group relative">
          <summary className="inline-flex h-8 cursor-pointer list-none items-center rounded-md border bg-background px-3 text-sm font-medium shadow-xs outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
            Export Gantt
          </summary>
          <div className="absolute right-0 z-30 mt-1 grid min-w-36 gap-1 rounded-md border bg-popover p-1 text-popover-foreground shadow-lg">
            <Button type="button" variant="ghost" size="sm" className="justify-start" onClick={downloadPng}>PNG</Button>
            <Button type="button" variant="ghost" size="sm" className="justify-start" onClick={downloadSvg}>SVG</Button>
          </div>
        </details>
      </div>

      <div className="overflow-x-auto rounded-lg border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="img" aria-label="Project timeline Gantt chart" tabIndex={0}>
        <div className="grid" style={{ gridTemplateColumns: `${LABEL_WIDTH} ${timelineWidth}px` }}>
          <div className="sticky left-0 z-[1] border-r bg-card">
            <div className="sticky left-0 z-[1] flex h-[52px] flex-col justify-center gap-1 border-b bg-card px-3">
              <span className="text-xs font-semibold">Phase</span>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-yellow-500" />Plan</span>
                <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-green-500" />Actual</span>
              </div>
            </div>
            {chart.bars.filter((bar) => bar.track === "Plan").map((bar) => (
              <div key={bar.id} className="relative h-[72px] border-b last:border-b-0">
                <span className="absolute top-1/2 left-3 max-w-[calc(100%-1.5rem)] -translate-y-1/2 truncate text-sm" title={bar.name}>
                  {bar.name}
                </span>
              </div>
            ))}
          </div>

          <div className="relative">
            <div className="flex h-7 border-b">
              {chart.months.map((month) => (
                <div
                  key={month.start}
                  className="shrink-0 overflow-hidden border-r px-2 text-xs leading-7 whitespace-nowrap text-muted-foreground"
                  style={{ width: `${month.days * DAY_WIDTH}px` }}
                >
                  {month.label}
                </div>
              ))}
            </div>
            <div className="flex h-6 border-b">
              {chart.months.map((month) => (
                <div key={month.start} className="flex shrink-0 border-r">
                  {month.weeks.map((week) => (
                    <div
                      key={week.number}
                      className="shrink-0 overflow-hidden border-r px-1 text-center text-[10px] leading-6 whitespace-nowrap text-muted-foreground last:border-r-0"
                      style={{ width: `${week.days * DAY_WIDTH}px` }}
                      title={`${month.label} · Week ${week.number}`}
                    >
                      {week.days >= 5 ? `Week ${week.number}` : `W${week.number}`}
                    </div>
                  ))}
                </div>
              ))}
            </div>

              {chart.bars.map((bar) => {
                if (!bar.visible) return <div key={bar.id} className={`relative ${ROW_HEIGHT} border-b last:border-b-0`} />;
              const days = (bar.end - bar.start) / DAY_MS + 1;
              const label = `${bar.name} · ${bar.track}: ${formatDate(toDateOnly(bar.start))} - ${formatDate(toDateOnly(bar.end))} (${days} ${days === 1 ? "day" : "days"})`;
              const offsetDays = drag?.id === bar.id ? drag.offsetDays : 0;
              const shiftedStart = bar.start + offsetDays * DAY_MS;
              const disabled = !onPhaseMove || savingPhaseId !== null || bar.track === "Actual";

              return (
                <div key={bar.id} className={`relative ${ROW_HEIGHT} border-b last:border-b-0`}>
                  <div
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    aria-label={`${label}${bar.track === "Plan" ? ". Drag to shift planned dates, or use left and right arrow keys." : ""}`}
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
                    className={`absolute top-1.5 bottom-1.5 min-w-1.5 rounded-md shadow-sm select-none touch-none ${disabled || bar.track === "Actual" ? "cursor-default" : "cursor-grab active:cursor-grabbing"} ${drag?.id === bar.id ? "z-10 ring-2 ring-foreground/40" : ""}`}
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

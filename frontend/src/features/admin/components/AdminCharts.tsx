import { Fragment, useMemo } from 'react';

import { cn } from '@/lib/utils';

import type { RankedMetric, TrendPoint } from '../types';

const buildLine = (values: number[], width: number, height: number, padding: number) => {
  if (values.length === 0) return '';
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const stepX = values.length === 1 ? 0 : (width - padding * 2) / (values.length - 1);

  return values
    .map((value, index) => {
      const x = padding + stepX * index;
      const normalized = (value - min) / range;
      const y = height - padding - normalized * (height - padding * 2);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
};

const buildArea = (line: string, width: number, height: number, padding: number) => {
  if (!line) return '';
  const commands = line.replace(/^M /, '').split('L ');
  const firstPoint = commands[0]?.trim().split(' ');
  const lastPoint = commands[commands.length - 1]?.trim().split(' ');

  if (!firstPoint || !lastPoint) return '';

  return `${line} L ${lastPoint[0]} ${height - padding} L ${firstPoint[0]} ${height - padding} Z`;
};

interface DualMetricChartProps {
  data: TrendPoint[];
  primaryLabel: string;
  secondaryLabel: string;
  className?: string;
}

export const DualMetricChart = ({
  data,
  primaryLabel,
  secondaryLabel,
  className,
}: DualMetricChartProps) => {
  const width = 640;
  const height = 220;
  const padding = 20;

  const primaryValues = useMemo(() => data.map((point) => point.primary), [data]);
  const secondaryValues = useMemo(() => data.map((point) => point.secondary ?? 0), [data]);
  const primaryPath = useMemo(
    () => buildLine(primaryValues, width, height, padding),
    [primaryValues]
  );
  const secondaryPath = useMemo(
    () => buildLine(secondaryValues, width, height, padding),
    [secondaryValues]
  );
  const primaryArea = useMemo(
    () => buildArea(primaryPath, width, height, padding),
    [primaryPath]
  );

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
          <span>{primaryLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          <span>{secondaryLabel}</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full">
          <defs>
            <linearGradient id="admin-area-primary" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(56, 189, 248, 0.35)" />
              <stop offset="100%" stopColor="rgba(56, 189, 248, 0)" />
            </linearGradient>
          </defs>

          {Array.from({ length: 4 }).map((_, index) => {
            const y = padding + ((height - padding * 2) / 3) * index;
            return (
              <line
                key={`grid-${y}`}
                x1={padding}
                x2={width - padding}
                y1={y}
                y2={y}
                stroke="rgba(148, 163, 184, 0.15)"
                strokeDasharray="4 8"
              />
            );
          })}

          <path d={primaryArea} fill="url(#admin-area-primary)" />
          <path d={primaryPath} fill="none" stroke="#4fd4ff" strokeWidth="3" strokeLinecap="round" />
          <path d={secondaryPath} fill="none" stroke="#86efac" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>

      <div className="grid grid-cols-7 gap-2 text-[11px] text-slate-400">
        {data.map((point) => (
          <div key={point.label} className="truncate">
            {point.label}
          </div>
        ))}
      </div>
    </div>
  );
};

interface RankedBarsProps {
  items: RankedMetric[];
  className?: string;
}

export const RankedBars = ({ items, className }: RankedBarsProps) => (
  <div className={cn('space-y-4', className)}>
    {items.map((item) => (
      <Fragment key={item.id}>
        <div className="flex items-start justify-between gap-4 text-sm">
          <div>
            <p className="font-medium text-slate-100">{item.label}</p>
            <p className="text-xs text-slate-400">{item.sublabel}</p>
          </div>
          <div className="text-right">
            <p className="font-medium text-cyan-200">{item.value}</p>
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-300"
            style={{ width: `${item.percent}%` }}
          />
        </div>
      </Fragment>
    ))}
  </div>
);

import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';

export interface ChartSlice {
  label: string;
  value: number;
  color: string;
}

export interface ChartPoint {
  label: string;
  value: number;
}

/**
 * Small dependency-free chart kit (donut + bars + line).
 *
 * Implemented with plain SVG rather than pulling in Chart.js/ApexCharts: the
 * app needs three simple, print-friendly visuals and nothing interactive, so a
 * library would add ~200 kB and a canvas lifecycle for no gain. Everything is
 * a function of the `data` inputs, so it also renders correctly in the
 * printable report.
 */
@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chart.html',
  styleUrl: './chart.css'
})
export class ChartComponent implements OnChanges {
  /** Which visual to render. */
  @Input() type: 'donut' | 'bars' | 'line' = 'donut';

  /** Used by donut + bars. */
  @Input() slices: ChartSlice[] = [];

  /** Used by the line chart. */
  @Input() points: ChartPoint[] = [];

  @Input() height = 220;

  /** Donut geometry, recomputed whenever the data changes. */
  donutSegments: { color: string; dash: string; offset: number }[] = [];

  donutTotal = 0;

  get hasData(): boolean {
    if (this.type === 'line') {
      return this.points.some(point => point.value > 0);
    }

    return this.slices.some(slice => slice.value > 0);
  }

  get maxValue(): number {
    const values =
      this.type === 'line'
        ? this.points.map(point => point.value)
        : this.slices.map(slice => slice.value);

    return Math.max(1, ...values);
  }

  /** Bar height as a percentage of the tallest bar. */
  barHeight(value: number): number {
    return Math.round((value / this.maxValue) * 100);
  }

  /** SVG polyline path for the line chart. */
  get linePath(): string {
    if (this.points.length === 0) {
      return '';
    }

    const width = 100;
    const step = this.points.length > 1 ? width / (this.points.length - 1) : 0;

    return this.points
      .map((point, index) => {
        const x = index * step;
        const y = 100 - (point.value / this.maxValue) * 100;
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  }

  ngOnChanges(): void {
    if (this.type !== 'donut') {
      return;
    }

    this.buildDonut();
  }

  /**
   * Convert absolute values into stroke-dasharray segments on a 100-unit
   * circumference circle, so the donut needs no trigonometry.
   */
  private buildDonut(): void {
    const total = this.slices.reduce((sum, slice) => sum + slice.value, 0);

    this.donutTotal = total;

    if (total === 0) {
      this.donutSegments = [];
      return;
    }

    // Stroke-dasharray pattern: `<filled> <gap>` where the gap is always the
    // full remaining circumference (100 - filled).
    this.donutSegments = this.slices
      .filter(slice => slice.value > 0)
      .map(slice => {
        const share = (slice.value / total) * 100;

        return {
          color: slice.color,
          dash: `${share.toFixed(3)} ${(100 - share).toFixed(3)}`,
          offset: 0,
        };
      });

    // Each ring is rotated so it starts where the previous one ended.
    let running = 0;

    this.donutSegments = this.donutSegments.map(segment => {
      const rotation = (running / 100) * 360;
      running += parseFloat(segment.dash);

      return { ...segment, offset: rotation };
    });
  }

  percent(value: number): string {
    if (this.donutTotal === 0) {
      return '0%';
    }

    return `${Math.round((value / this.donutTotal) * 100)}%`;
  }
}
import { FullCompoundReport } from '../../Services/admin-service';

/**
 * Client-side report export.
 *
 * The API returns one structured JSON payload (`GET /api/admin/reports/full`);
 * turning it into a downloadable file happens here so the backend never has to
 * guess a format, and a new export type is a pure front-end change.
 */

/** Quote a CSV cell: escape quotes and wrap anything with a delimiter. */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const text = String(value);

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function csvRows(rows: unknown[][]): string {
  return rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}

/** Format a populated (or raw) unit reference as a readable label. */
function unitLabel(unit: unknown): string {
  if (!unit) return '';
  if (typeof unit === 'string') return unit;

  const value = unit as { unitNumber?: number; floor?: number };

  if (value.unitNumber == null) return '';

  return value.floor == null
    ? `Unit ${value.unitNumber}`
    : `Unit ${value.unitNumber} (Floor ${value.floor})`;
}

function personLabel(person: unknown): string {
  if (!person) return '';
  if (typeof person === 'string') return person;

  return (person as { name?: string }).name || '';
}

/**
 * Build a single CSV file containing every section of the compound report.
 *
 * Sections are separated by a blank line and a title row rather than being
 * split into several files: the whole point of the button is one download that
 * opens in Excel and can be handed to management.
 */
export function buildCompoundReportCsv(report: FullCompoundReport): string {
  const sections: string[] = [];

  // ---------------------------------------------------------------- Overview
  sections.push('CIVICSYNC — FULL COMPOUND REPORT');
  sections.push(csvRows([['Generated at', report.generatedAt]]));
  sections.push('');

  const overview = report.overview;

  sections.push('OVERVIEW');
  sections.push(
    csvRows([
      ['Metric', 'Value'],
      ['Total users', overview.users.total],
      ['Pending users', overview.users.pending],
      ['Active residents', overview.users.activeResidents],
      ['Active technicians', overview.users.activeTechnicians],
      ['Active security', overview.users.activeSecurity],
      ['Total buildings', overview.buildings.total],
      ['Total units', overview.units.total],
      ['Occupied units', overview.units.occupied],
      ['Vacant units', overview.units.vacant],
      ['Open maintenance', overview.maintenance.open],
      ['Overdue invoices', overview.invoices.overdue],
      ['Total visits', overview.visits.total],
    ])
  );
  sections.push('');

  // ----------------------------------------------------------------- Revenue
  const revenue = report.analytics.revenue;

  sections.push('REVENUE');
  sections.push(
    csvRows([
      ['Metric', 'Amount'],
      ['Total billed', revenue.totalBilled],
      ['Paid', revenue.paid],
      ['Outstanding', revenue.outstanding],
      ['Overdue', revenue.overdue],
    ])
  );
  sections.push('');

  // ------------------------------------------------------------- User directory
  sections.push('USER DIRECTORY');
  sections.push(
    csvRows([
      ['Name', 'Email', 'Phone', 'Role', 'Status', 'Unit'],
      ...report.users.map(user => [
        user.name,
        user.email,
        user.phone || '',
        user.role,
        user.status,
        unitLabel(user.unitId),
      ]),
    ])
  );
  sections.push('');

  // ---------------------------------------------------------------- Buildings
  sections.push('BUILDINGS');
  sections.push(
    csvRows([
      ['Name', 'Number', 'Floors', 'Units'],
      ...report.buildings.map(building => [
        building.name,
        building.buildingNumber,
        building.floorsCount ?? building.floors ?? '',
        building.unitsCount ?? '',
      ]),
    ])
  );
  sections.push('');

  // -------------------------------------------------------------------- Units
  sections.push('UNITS');
  sections.push(
    csvRows([
      ['Building', 'Unit', 'Floor', 'Type', 'Status'],
      ...report.units.map(unit => [
        typeof unit.buildingId === 'object' && unit.buildingId
          ? (unit.buildingId as { name: string }).name
          : '',
        unit.unitNumber,
        unit.floor,
        unit.type,
        unit.status,
      ]),
    ])
  );
  sections.push('');

  // ------------------------------------------------------------- Maintenance
  sections.push('MAINTENANCE');
  sections.push(
    csvRows([
      ['Title', 'Category', 'Priority', 'Status', 'Resident', 'Technician', 'Created'],
      ...report.maintenance.map(ticket => [
        ticket.title,
        ticket.category,
        ticket.priority,
        ticket.status,
        personLabel(ticket.residentId),
        personLabel(ticket.assignedTo),
        ticket.createdAt,
      ]),
    ])
  );
  sections.push('');

  // ----------------------------------------------------------------- Invoices
  sections.push('INVOICES');
  sections.push(
    csvRows([
      ['Resident', 'Amount', 'Status', 'Due date', 'Paid at', 'Created'],
      ...report.invoices.map(invoice => [
        personLabel(invoice.residentId),
        invoice.amount,
        invoice.status,
        invoice.dueDate,
        invoice.paidAt || '',
        invoice.createdAt,
      ]),
    ])
  );
  sections.push('');

  // ------------------------------------------------------------------- Visits
  sections.push('VISIT LOGS');
  sections.push(
    csvRows([
      ['Visitor', 'Email', 'Status', 'Source', 'Visit date', 'Start time', 'Resident'],
      ...report.visits.map(visit => [
        visit.visitorName,
        visit.visitorEmail,
        visit.status,
        visit.source,
        visit.visitDate,
        visit.visitStartTime,
        personLabel(visit.residentId),
      ]),
    ])
  );

  return sections.join('\r\n');
}

/** Trigger a browser download for generated text content. */
export function downloadTextFile(
  filename: string,
  content: string,
  mimeType = 'text/csv;charset=utf-8'
): void {
  // The BOM keeps Excel from mangling non-ASCII names on Windows.
  const blob = new Blob(['\uFEFF' + content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  URL.revokeObjectURL(url);
}

/** `civicsync-compound-report-2026-02-14.csv` */
export function reportFilename(extension: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `civicsync-compound-report-${stamp}.${extension}`;
}
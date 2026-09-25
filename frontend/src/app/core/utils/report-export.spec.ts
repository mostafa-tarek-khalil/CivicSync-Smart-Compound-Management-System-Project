/**
 * The report export is the actual deliverable of the "Download full compound
 * report" button, so it is tested against a minimal but structurally faithful
 * payload rather than a live API.
 */
import { FullCompoundReport } from '../../Services/admin-service';
import { buildCompoundReportCsv } from './report-export';

const report = {
  generatedAt: '2026-02-14T10:00:00.000Z',
  overview: {
    users: {
      total: 12,
      pending: 2,
      activeResidents: 6,
      activeTechnicians: 2,
      activeSecurity: 1,
    },
    buildings: { total: 2 },
    units: { total: 20, occupied: 14, vacant: 6 },
    maintenance: { open: 3 },
    invoices: { overdue: 1 },
    visits: { total: 9 },
  },
  analytics: {
    users: { byRole: [], byStatus: [] },
    maintenance: { byStatus: [], byPriority: [] },
    invoices: { byStatus: [] },
    visits: { byStatus: [], overTime: [] },
    units: { byStatus: [] },
    revenue: {
      totalBilled: 5000,
      paid: 3000,
      outstanding: 2000,
      overdue: 500,
      byStatus: {},
    },
  },
  users: [
    {
      _id: 'u1',
      name: 'Sara Ahmed',
      email: 'sara@compound.com',
      phone: '+201234567890',
      role: 'RESIDENT',
      status: 'ACTIVE',
      unitId: { unitNumber: 12, floor: 3 },
    },
  ],
  buildings: [
    { _id: 'b1', name: 'Cedar', buildingNumber: 1, floorsCount: 5, unitsCount: 10 },
  ],
  units: [
    {
      _id: 'un1',
      unitNumber: 12,
      floor: 3,
      type: 'APARTMENT',
      status: 'OCCUPIED',
      buildingId: { _id: 'b1', name: 'Cedar', buildingNumber: 1 },
    },
  ],
  maintenance: [
    {
      _id: 't1',
      title: 'Leaking tap',
      category: 'PLUMBING',
      priority: 'HIGH',
      status: 'OPEN',
      createdAt: '2026-02-01T09:00:00.000Z',
      residentId: { _id: 'u1', name: 'Sara Ahmed' },
      assignedTo: null,
    },
  ],
  invoices: [
    {
      _id: 'i1',
      amount: 250,
      status: 'PENDING',
      dueDate: '2026-03-01',
      createdAt: '2026-02-01T09:00:00.000Z',
      paidAt: null,
      residentId: { _id: 'u1', name: 'Sara Ahmed' },
    },
  ],
  visits: [
    {
      _id: 'v1',
      visitorName: 'Omar',
      visitorEmail: 'omar@example.com',
      status: 'CHECKED_IN',
      source: 'VISITOR_REQUEST',
      visitDate: '2026-02-10T00:00:00.000Z',
      visitStartTime: '18:30',
      residentId: { _id: 'u1', name: 'Sara Ahmed' },
    },
  ],
} as unknown as FullCompoundReport;

describe('buildCompoundReportCsv', () => {
  const csv = buildCompoundReportCsv(report);

  it('contains every report section', () => {
    for (const heading of [
      'CIVICSYNC — FULL COMPOUND REPORT',
      'OVERVIEW',
      'REVENUE',
      'USER DIRECTORY',
      'BUILDINGS',
      'UNITS',
      'MAINTENANCE',
      'INVOICES',
      'VISIT LOGS',
    ]) {
      expect(csv).toContain(heading);
    }
  });

  it('includes the complete user directory with contact details and units', () => {
    expect(csv).toContain('Sara Ahmed');
    expect(csv).toContain('sara@compound.com');
    expect(csv).toContain('+201234567890');
    expect(csv).toContain('Unit 12 (Floor 3)');
  });

  it('renders overview metrics and revenue totals', () => {
    expect(csv).toContain('Total users,12');
    expect(csv).toContain('Total billed,5000');
    expect(csv).toContain('Outstanding,2000');
  });

  it('lists maintenance, invoices and visits', () => {
    expect(csv).toContain('Leaking tap');
    expect(csv).toContain('250,PENDING');
    expect(csv).toContain('Omar');
  });

  it('quotes cells containing the delimiter so the CSV never breaks', () => {
    const tricky = {
      ...report,
      users: [
        {
          _id: 'u2',
          name: 'Doe, John',
          email: 'john@compound.com',
          phone: null,
          role: 'RESIDENT',
          status: 'ACTIVE',
          unitId: null,
        },
      ],
    } as unknown as FullCompoundReport;

    expect(buildCompoundReportCsv(tricky)).toContain('"Doe, John"');
  });
});
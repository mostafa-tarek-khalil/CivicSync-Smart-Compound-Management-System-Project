import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AdminService,
  AdminBuilding,
  AdminUnit
} from '../../../Services/admin-service';

@Component({
  selector: 'app-admin-compound',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-compound.html',
  styleUrl: '../shared/admin-shared.css'
})
export class AdminCompound implements OnInit {
  buildings: AdminBuilding[] = [];
  units: AdminUnit[] = [];

  loading = false;
  unitsLoading = false;

  errorMessage = '';
  successMessage = '';

  selectedBuildingId = '';
  unitStatusFilter = '';

  buildingModalOpen = false;
  savingBuilding = false;
  editingBuildingId = '';

  buildingForm = {
    name: '',
    buildingNumber: null as number | null,
    floorsCount: null as number | null,
    unitsCount: null as number | null,
    description: ''
  };

  unitModalOpen = false;
  savingUnit = false;
  editingUnitId = '';

  unitForm = {
    buildingId: '',
    unitNumber: null as number | null,
    floor: null as number | null,
    type: 'APARTMENT',
    status: 'VACANT'
  };

  readonly unitTypes = [
    'APARTMENT',
    'DUPLEX',
    'STUDIO',
    'OFFICE',
    'SHOP'
  ];

  readonly unitStatuses = [
    'VACANT',
    'OCCUPIED',
    'MAINTENANCE'
  ];

  readonly unitStatusFilters = [
    '',
    'VACANT',
    'OCCUPIED',
    'MAINTENANCE'
  ];

  constructor(
    private adminService: AdminService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadBuildings();
  }

  loadBuildings(): void {
    this.loading = true;
    this.errorMessage = '';

    this.adminService.getBuildings().subscribe({
      next: response => {
        this.buildings = response.data || [];
        this.loading = false;

        if (this.selectedBuildingId) {
          const selectedBuildingExists = this.buildings.some(
            building => building._id === this.selectedBuildingId
          );

          if (!selectedBuildingExists) {
            this.selectedBuildingId = '';
          }
        }

        this.loadUnits();
        this.cdr.detectChanges();
      },
      error: error => {
        this.loading = false;
        this.errorMessage =
          error?.error?.message || 'Could not load buildings.';

        this.cdr.detectChanges();
      }
    });
  }

  loadUnits(): void {
    this.unitsLoading = true;
    this.errorMessage = '';

    const filters: {
      buildingId?: string;
      status?: string;
    } = {};

    if (this.selectedBuildingId?.trim()) {
      filters.buildingId = this.selectedBuildingId.trim();
    }

    if (this.unitStatusFilter?.trim()) {
      filters.status = this.unitStatusFilter.trim();
    }

    this.adminService.getUnits(filters).subscribe({
      next: response => {
        this.units = response.data || [];
        this.unitsLoading = false;
        this.cdr.detectChanges();
      },
      error: error => {
        this.units = [];
        this.unitsLoading = false;

        this.errorMessage =
          error?.error?.message || 'Could not load units.';

        this.cdr.detectChanges();
      }
    });
  }

  applyUnitFilters(): void {
    this.loadUnits();
  }

  openCreateBuilding(): void {
    this.editingBuildingId = '';

    this.buildingForm = {
      name: '',
      buildingNumber: null,
      floorsCount: null,
      unitsCount: null,
      description: ''
    };

    this.errorMessage = '';
    this.successMessage = '';
    this.buildingModalOpen = true;
  }

  openEditBuilding(building: AdminBuilding): void {
    this.editingBuildingId = building._id;

    this.buildingForm = {
      name: building.name,
      buildingNumber: building.buildingNumber,
      floorsCount: building.floorsCount ?? building.floors ?? null,
      unitsCount: building.unitsCount ?? null,
      description: building.description || ''
    };

    this.errorMessage = '';
    this.successMessage = '';
    this.buildingModalOpen = true;
  }

  closeBuildingModal(): void {
    if (this.savingBuilding) {
      return;
    }

    this.buildingModalOpen = false;
  }

  saveBuilding(): void {
    if (
      !this.buildingForm.name?.trim() ||
      !this.buildingForm.buildingNumber ||
      !this.buildingForm.floorsCount
    ) {
      this.errorMessage =
        'Building name, number and floors count are required.';
      return;
    }

    this.savingBuilding = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = {
      name: this.buildingForm.name.trim(),
      buildingNumber: Number(this.buildingForm.buildingNumber),
      floorsCount: Number(this.buildingForm.floorsCount),
      unitsCount:
        this.buildingForm.unitsCount != null
          ? Number(this.buildingForm.unitsCount)
          : 0,
      description: this.buildingForm.description?.trim() || undefined
    };

    const request = this.editingBuildingId
      ? this.adminService.updateBuilding(
          this.editingBuildingId,
          payload
        )
      : this.adminService.createBuilding(payload);

    request.subscribe({
      next: () => {
        const wasEditing = !!this.editingBuildingId;

        this.savingBuilding = false;
        this.buildingModalOpen = false;

        this.successMessage = wasEditing
          ? 'Building updated.'
          : 'Building created.';

        this.loadBuildings();
        this.cdr.detectChanges();
      },
      error: error => {
        this.savingBuilding = false;

        this.errorMessage =
          error?.error?.message || 'Could not save the building.';

        this.cdr.detectChanges();
      }
    });
  }

  openCreateUnit(): void {
    this.editingUnitId = '';

    this.unitForm = {
      buildingId:
        this.selectedBuildingId ||
        this.buildings[0]?._id ||
        '',
      unitNumber: null,
      floor: null,
      type: 'APARTMENT',
      status: 'VACANT'
    };

    this.errorMessage = '';
    this.successMessage = '';
    this.unitModalOpen = true;
  }

  openEditUnit(unit: AdminUnit): void {
    this.editingUnitId = unit._id;

    const buildingId =
      typeof unit.buildingId === 'object' && unit.buildingId
        ? unit.buildingId._id
        : String(unit.buildingId || '');

    this.unitForm = {
      buildingId,
      unitNumber: unit.unitNumber,
      floor: unit.floor,
      type: unit.type,
      status: unit.status
    };

    this.errorMessage = '';
    this.successMessage = '';
    this.unitModalOpen = true;
  }

  closeUnitModal(): void {
    if (this.savingUnit) {
      return;
    }

    this.unitModalOpen = false;
  }

  saveUnit(): void {
    const buildingId = this.unitForm.buildingId?.trim();

    if (
      !buildingId ||
      !this.unitForm.unitNumber ||
      this.unitForm.floor == null
    ) {
      this.errorMessage =
        'Building, unit number and floor are required.';
      return;
    }

    this.savingUnit = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = {
      unitNumber: Number(this.unitForm.unitNumber),
      floor: Number(this.unitForm.floor),
      type: this.unitForm.type,
      status: this.unitForm.status
    };

    const request = this.editingUnitId
      ? this.adminService.updateUnit(
          this.editingUnitId,
          payload
        )
      : this.adminService.createUnit({
          buildingId,
          ...payload
        });

    request.subscribe({
      next: () => {
        const wasEditing = !!this.editingUnitId;

        this.savingUnit = false;
        this.unitModalOpen = false;

        this.successMessage = wasEditing
          ? 'Unit updated.'
          : 'Unit created.';

        this.loadUnits();
        this.cdr.detectChanges();
      },
      error: error => {
        this.savingUnit = false;

        this.errorMessage =
          error?.error?.message || 'Could not save the unit.';

        this.cdr.detectChanges();
      }
    });
  }

  get occupiedCount(): number {
    return this.units.filter(
      unit => unit.status === 'OCCUPIED'
    ).length;
  }

  get vacantCount(): number {
    return this.units.filter(
      unit => unit.status === 'VACANT'
    ).length;
  }

  buildingLabel(unit: AdminUnit): string {
    if (
      typeof unit.buildingId === 'object' &&
      unit.buildingId
    ) {
      return unit.buildingId.name;
    }

    return this.buildingNameById(
      String(unit.buildingId || '')
    );
  }

  buildingNameById(id: string): string {
    if (!id) {
      return '—';
    }

    const building = this.buildings.find(
      b => b._id === id
    );

    return building ? building.name : '—';
  }

  statusClass(status: string): string {
    switch (status) {
      case 'OCCUPIED':
        return 'status-active';

      case 'MAINTENANCE':
        return 'status-pending';

      default:
        return 'status-vacant';
    }
  }
}
import {
  ChangeDetectorRef,
  Component,
  HostListener,
  OnInit
} from '@angular/core';

import { FormsModule } from '@angular/forms';

import { HttpClient } from '@angular/common/http';

import {
  Router,
  RouterLink
} from '@angular/router';

import {
  TimeoutError
} from 'rxjs';

import {
  timeout
} from 'rxjs/operators';

import {
  AuthService
} from '../../Services/auth-service';


type RegisterRole =
  | 'RESIDENT'
  | 'TECHNICIAN'
  | 'SECURITY';


interface AvailableUnit {

  _id: string;

  buildingId: {

    _id: string;

    name: string;

    buildingNumber: number;

  };

  unitNumber: number;

  floor: number;

  type:
  | 'APARTMENT'
  | 'VILLA';

  status: 'VACANT';

}


@Component({

  selector: 'app-register-details-page',

  standalone: true,

  imports: [

    FormsModule,

    RouterLink

  ],

  templateUrl:
    './register-details-page.html',

  styleUrl:
    './register-details-page.css'

})


export class RegisterDetailsPage
  implements OnInit {


  role: RegisterRole | null = null;


  unitId = '';


  availableUnits:
    AvailableUnit[] = [];


  loadingUnits = false;


  /*
   * Custom Unit Dropdown
   */
  unitDropdownOpen = false;


  readonly specializations = [

    'PLUMBING',

    'ELECTRICITY',

    'ELEVATOR',

    'AC',

    'GENERAL'

  ];


  selectedSpecializations:
    string[] = [];


  submitted = false;


  loading = false;


  errorMessage = '';


  constructor(

    private router: Router,

    private authService: AuthService,

    private http: HttpClient,

    private cdr: ChangeDetectorRef

  ) { }


  ngOnInit(): void {

    this.loadRegistrationData();

  }


  /*
   * Close the custom dropdown
   * when clicking anywhere outside it.
   */
  @HostListener(
    'document:click',
    ['$event']
  )

  onDocumentClick(
    event: MouseEvent
  ): void {

    const target =
      event.target as HTMLElement;

    if (
      !target.closest(
        '.custom-select'
      )
    ) {

      this.unitDropdownOpen = false;

    }

  }


  get roleTitle(): string {

    switch (this.role) {

      case 'RESIDENT':

        return 'Connect your unit';


      case 'TECHNICIAN':

        return 'Set your specialties';


      case 'SECURITY':

        return 'Complete your profile';


      default:

        return 'Complete your profile';

    }

  }


  get roleDescription(): string {

    switch (this.role) {

      case 'RESIDENT':

        return 'Select the vacant unit assigned to you.';


      case 'TECHNICIAN':

        return 'Select the maintenance areas you are qualified to handle.';


      case 'SECURITY':

        return 'Your security account does not require any additional details.';


      default:

        return 'Add the final details required for your account.';

    }

  }


  get unitIdError(): string {

    if (

      !this.submitted &&

      !this.unitId

    ) {

      return '';

    }


    if (!this.unitId) {

      return 'Please select your unit.';

    }


    return '';

  }


  get specializationsError(): string {

    if (

      !this.submitted &&

      this.selectedSpecializations.length === 0

    ) {

      return '';

    }


    if (

      this.selectedSpecializations.length === 0

    ) {

      return 'Please select at least one specialization.';

    }


    return '';

  }


  /*
   * Returns the currently selected Unit.
   */
  get selectedUnit():
    AvailableUnit | null {

    if (!this.unitId) {

      return null;

    }


    return (
      this.availableUnits.find(
        unit =>
          unit._id === this.unitId
      ) || null
    );

  }


  /*
   * Open / close Unit dropdown.
   */
  toggleUnitDropdown(
    event?: MouseEvent
  ): void {

    if (event) {

      event.stopPropagation();

    }


    if (

      this.loading ||

      this.loadingUnits ||

      this.availableUnits.length === 0

    ) {

      return;

    }


    this.errorMessage = '';


    this.unitDropdownOpen =
      !this.unitDropdownOpen;

  }


  /*
   * Select a Unit from the custom dropdown.
   */
  selectUnit(
    unit: AvailableUnit,
    event?: MouseEvent
  ): void {

    if (event) {

      event.stopPropagation();

    }


    if (this.loading) {

      return;

    }


    this.unitId = unit._id;

    this.unitDropdownOpen = false;

    this.errorMessage = '';

    this.submitted = false;

  }


  /*
   * Track function for Angular @for.
   */
  trackUnit(
    index: number,
    unit: AvailableUnit
  ): string {

    return unit._id;

  }


  isSpecializationSelected(

    specialization: string

  ): boolean {

    return this.selectedSpecializations.includes(

      specialization

    );

  }


  selectSpecialization(

    specialization: string

  ): void {

    if (this.loading) {

      return;

    }


    this.errorMessage = '';


    const index =

      this.selectedSpecializations.indexOf(

        specialization

      );


    if (index === -1) {

      this.selectedSpecializations.push(

        specialization

      );

    } else {

      this.selectedSpecializations.splice(

        index,

        1

      );

    }

  }


  isValid(): boolean {

    if (!this.role) {

      return false;

    }


    if (this.role === 'RESIDENT') {

      return !!this.unitId;

    }


    if (this.role === 'TECHNICIAN') {

      return (

        this.selectedSpecializations.length > 0

      );

    }


    if (this.role === 'SECURITY') {

      return true;

    }


    return false;

  }


  private loadAvailableUnits(): void {

    this.loadingUnits = true;

    this.availableUnits = [];

    this.unitDropdownOpen = false;

    this.errorMessage = '';


    this.cdr.detectChanges();


    this.http

      .get<{

        success: boolean;

        data: AvailableUnit[];

      }>(

        'http://localhost:3000/api/units/available'

      )

      .pipe(

        timeout(10000)

      )

      .subscribe({

        next: (response) => {

          console.log(

            'AVAILABLE UNITS RESPONSE:',

            response

          );


          if (

            response &&

            response.success &&

            Array.isArray(response.data)

          ) {

            this.availableUnits =

              response.data;


            console.log(

              'AVAILABLE UNITS ARRAY:',

              this.availableUnits

            );


            this.restoreSavedUnit();


          } else {

            this.availableUnits = [];


            this.errorMessage =

              'Unable to load available units.';

          }


          this.loadingUnits = false;


          console.log(

            'UNITS READY:',

            this.availableUnits.length

          );


          this.cdr.detectChanges();

        },


        error: (error) => {

          console.error(

            'AVAILABLE UNITS ERROR:',

            error

          );


          this.availableUnits = [];

          this.loadingUnits = false;

          this.unitDropdownOpen = false;


          if (

            error instanceof TimeoutError

          ) {

            this.errorMessage =

              'Loading available units is taking too long. Please try again.';

          }

          else if (

            error?.status === 0

          ) {

            this.errorMessage =

              'Unable to load available units. Please make sure the server is running.';

          }

          else {

            this.errorMessage =

              error?.error?.message ||

              'Unable to load available units. Please try again.';

          }


          this.cdr.detectChanges();

        },


        complete: () => {

          console.log(

            'AVAILABLE UNITS REQUEST COMPLETED'

          );

        }

      });

  }


  private restoreSavedUnit(): void {

    const savedData =

      sessionStorage.getItem(

        'civicsync_register'

      );


    if (!savedData) {

      return;

    }


    try {

      const registerData =

        JSON.parse(savedData);


      if (!registerData.unitId) {

        return;

      }


      const unitStillAvailable =

        this.availableUnits.some(

          unit =>

            unit._id ===

            registerData.unitId

        );


      if (unitStillAvailable) {

        this.unitId =

          registerData.unitId;

      }

      else {

        this.unitId = '';

      }


    }

    catch {

      this.unitId = '';

    }

  }


  completeRegistration(): void {

    if (this.loading) {

      return;

    }


    this.submitted = true;

    this.errorMessage = '';

    this.unitDropdownOpen = false;


    if (!this.isValid()) {

      this.errorMessage =

        'Please complete the required information before creating your account.';

      return;

    }


    const savedData =

      sessionStorage.getItem(

        'civicsync_register'

      );


    if (!savedData) {

      this.router.navigate([

        '/register'

      ]);

      return;

    }


    let registerData: any;


    try {

      registerData =

        JSON.parse(savedData);

    }

    catch {

      sessionStorage.removeItem(

        'civicsync_register'

      );


      this.router.navigate([

        '/register'

      ]);

      return;

    }


    const payload: {

      name: string;

      phone: string;

      email: string;

      password: string;

      role: RegisterRole;

      unitId?: string;

      specializations?: string[];

    } = {

      name: registerData.name,

      phone: registerData.phone,

      email: registerData.email,

      password: registerData.password,

      role: this.role!

    };


    if (this.role === 'RESIDENT') {

      payload.unitId =

        this.unitId;

    }


    if (this.role === 'TECHNICIAN') {

      payload.specializations = [

        ...this.selectedSpecializations

      ];

    }


    this.loading = true;


    this.authService

      .register(payload)

      .pipe(

        timeout(15000)

      )

      .subscribe({

        next: (response) => {

          console.log(

            'REGISTRATION SUCCESS:',

            response

          );


          sessionStorage.removeItem(

            'civicsync_register'

          );


          this.router.navigate([

            '/login'

          ]);

        },

        error: (error) => {

          console.error(
            'REGISTRATION ERROR:',
            error
          );

          this.loading = false;

          if (error instanceof TimeoutError) {

            this.errorMessage =
              'The registration request is taking too long. Please try again.';

          }
          else if (error?.status === 0) {

            this.errorMessage =
              'Unable to connect to CivicSync. Please make sure the server is running.';

          }
          else if (error?.status === 400) {

            this.errorMessage =
              error?.error?.message ||
              'Please check your registration information.';

          }
          else {

            this.errorMessage =
              error?.error?.message ||
              'Unable to create your account. Please try again.';

          }

          this.cdr.detectChanges();

        }

      });

  }


  goBack(): void {

    if (this.loading) {

      return;

    }


    this.unitDropdownOpen = false;


    this.router.navigate([

      '/register/role'

    ]);

  }


  private loadRegistrationData(): void {

    const savedData =

      sessionStorage.getItem(

        'civicsync_register'

      );


    if (!savedData) {

      this.router.navigate([

        '/register'

      ]);

      return;

    }


    try {

      const registerData =

        JSON.parse(savedData);


      if (

        registerData.role !== 'RESIDENT' &&

        registerData.role !== 'TECHNICIAN' &&

        registerData.role !== 'SECURITY'

      ) {

        this.router.navigate([

          '/register/role'

        ]);

        return;

      }


      this.role =

        registerData.role;


      if (

        this.role === 'TECHNICIAN' &&

        Array.isArray(

          registerData.specializations

        )

      ) {

        this.selectedSpecializations = [

          ...registerData.specializations

        ];

      }


      if (

        this.role === 'RESIDENT'

      ) {

        this.loadAvailableUnits();

      }


    }

    catch {

      sessionStorage.removeItem(

        'civicsync_register'

      );


      this.router.navigate([

        '/register'

      ]);

    }

  }

}
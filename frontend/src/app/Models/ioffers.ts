export interface ITechnicianInfo {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  rating?: number;
  completedJobsCount?: number;
  specialization?: string;
}

export interface IOffer {
  _id: string;
  ticketId: string;
  technicianId: string | ITechnicianInfo;
  price: number;
  estimatedDuration: string; 
  message?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
  createdAt: string;
  updatedAt?: string;
}


export interface IOffersResponse {
  status: string;
  results?: number;
  offers: IOffer[];
}
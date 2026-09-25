export interface IUserSummary {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  profileImage?: string | null;
  role?: 'RESIDENT' | 'SECURITY' | 'TECHNICIAN' | 'ADMIN';
  specializations?: string[];
  rating?: number;
  totalReviews?: number;
}
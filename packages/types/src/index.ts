export type Role = 'USER' | 'OWNER' | 'ADMIN' | 'SUPER_ADMIN';

export type PropertyStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'PAUSED' | 'REJECTED' | 'SOLD_RENTED';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: Role;
}

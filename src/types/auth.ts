export type Role = 'super_admin' | 'branch_manager' | 'customer_service' | 'rental_officer' | 'inspector' | 'driver' | 'finance';

export interface AuthUser {
  userId: number;
  email: string;
  role: Role;
  branchId: number | null;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  role: Role;
  branch_id: number | null;
  branch_name?: string;
  status: 'active' | 'inactive' | 'suspended';
  must_change_password: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

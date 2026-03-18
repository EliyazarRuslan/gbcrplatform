export type InspectionType = 'pre_rental' | 'post_return' | 'ad_hoc';
export type InspectionStatus = 'draft' | 'in_progress' | 'submitted' | 'reviewed' | 'approved' | 'disputed' | 'void';
export type DiagramView = 'top' | 'front' | 'rear' | 'left' | 'right';
export type RepairStatus = 'pending' | 'in_progress' | 'completed' | 'waived';

export interface Inspection {
  id: number;
  booking_id: number | null;
  vehicle_assetnum: string;
  vehicle_regno: string;
  inspection_type: InspectionType;
  status: InspectionStatus;
  inspector_id: number;
  inspection_date: string | null;
  mileage_reading: number | null;
  fuel_level: number | null;
  exterior_condition: string | null;
  interior_condition: string | null;
  functionality_check: string | null;
  tire_condition: string | null;
  safety_equipment: string | null;
  cleanliness_interior: number | null; // 1-5
  cleanliness_exterior: number | null; // 1-5
  smell_condition: string | null;
  overall_notes: string | null;
  checklist_data: Record<string, unknown> | null;
  accessories_present: Record<string, unknown> | null;
  inspector_signature: string | null;
  customer_signature: string | null;
  customer_acknowledged: boolean;
  gps_latitude: number | null;
  gps_longitude: number | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  inspector_name?: string;
  reviewer_name?: string;
}

export interface DamageRecord {
  id: number;
  inspection_id: number;
  vehicle_assetnum: string;
  diagram_view: DiagramView;
  diagram_x: number;
  diagram_y: number;
  zone: string | null;
  damage_type: string;
  severity: string;
  description: string | null;
  is_pre_existing: boolean;
  estimated_repair_cost: number | null;
  charge_to_customer: boolean;
  approved_by: number | null;
  approved_at: string | null;
  repair_status: RepairStatus | null;
  created_at: string;
  updated_at: string;
}

export interface InspectionPhoto {
  id: number;
  inspection_id: number;
  damage_record_id: number | null;
  photo_type: string;
  file_path: string;
  file_size: number | null;
  captured_at: string | null;
  gps_latitude: number | null;
  gps_longitude: number | null;
  uploaded_by: number;
  created_at: string;
}

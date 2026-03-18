// Fleet types
export interface Vehicle {
  assetnum: string;
  description: string;
  status: string;
  status_description: string;
  siteid: string;
  pluspcustomer: string | null;
  serialnum: string | null;
  gb_regno: string | null;
  gb_make: string | null;
  gb_model: string | null;
  gb_vehicletype: string | null;
  changedate: string | null;
  installdate: string | null;
  purchaseprice: number | null;
  totdowntime: number | null;
  totunchargedcost: number | null;
  totalcost: number | null;
}

export interface FleetStats {
  total: number;
  hiredOut: number;
  notReady: number;
  idle: number;
  booked: number;
  inService: number;
  decommissioned: number;
  utilizationRate: number;
}

export interface VehicleDetail extends Vehicle {
  laborCost: number;
  materialCost: number;
  totalRevenue: number;
  workOrderCount: number;
  lastServiceDate: string | null;
  bookingHistory: Booking[];
  workOrders: WorkOrderSummary[];
}

// Booking types
export interface Booking {
  id: string;
  assetnum: string;
  customer_name: string;
  customer_code: string;
  start_date: string;
  end_date: string;
  status: 'PENDING' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  daily_rate: number | null;
  total_amount: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingFormData {
  assetnum: string;
  customer_name: string;
  customer_code: string;
  start_date: string;
  end_date: string;
  daily_rate: number | null;
  notes: string | null;
}

// Work Order types
export interface WorkOrderSummary {
  wonum: string;
  description: string;
  status: string;
  worktype: string;
  reportdate: string | null;
  actfinish: string | null;
  pluspcustomer: string | null;
  estdur: number | null;
}

// Customer types
export interface Customer {
  customer: string;
  name: string;
  department: string | null;
  payterm: string | null;
  creditlimit: number | null;
  activeRentals: number;
  totalRevenue: number;
}

// Analytics types
export interface RevenueData {
  month: string;
  revenue: number;
  cost: number;
  profit: number;
}

export interface UtilizationData {
  month: string;
  rate: number;
  hiredCount: number;
  totalCount: number;
}

// AI types
export interface AIForecast {
  id: string;
  forecast_type: string;
  period: string;
  predicted_value: number;
  confidence_lower: number;
  confidence_upper: number;
  created_at: string;
}

export interface AIAnomaly {
  id: string;
  anomaly_type: string;
  entity_id: string;
  entity_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  detected_at: string;
  resolved: boolean;
}

export interface AIChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface AIRecommendation {
  id: string;
  category: string;
  title: string;
  description: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'NEW' | 'REVIEWED' | 'IMPLEMENTED' | 'DISMISSED';
  created_at: string;
}

export interface MaintenanceScore {
  assetnum: string;
  score: number;
  factors: {
    daysSinceService: number;
    repairFrequency: number;
    vehicleAge: number;
    costRatio: number;
    openRecalls: number;
  };
  recommendation: string;
}

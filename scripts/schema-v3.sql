-- Inspection module tables for GBCR Platform
-- Run against GBCR_Platform database on GBITR01V

-- Inspections
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'inspections')
CREATE TABLE inspections (
  id INT IDENTITY(1,1) PRIMARY KEY,
  booking_id UNIQUEIDENTIFIER NULL REFERENCES bookings(id),
  vehicle_assetnum VARCHAR(30) NOT NULL,
  vehicle_regno VARCHAR(20) NULL,
  inspection_type VARCHAR(20) NOT NULL CHECK (inspection_type IN ('pre_rental', 'post_return', 'ad_hoc')),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'submitted', 'reviewed', 'approved', 'disputed', 'void')),
  inspector_id INT NOT NULL REFERENCES users(id),
  inspection_date DATETIME2 NOT NULL DEFAULT GETDATE(),
  mileage_reading INT NULL,
  fuel_level VARCHAR(20) NULL CHECK (fuel_level IN ('empty', 'quarter', 'half', 'three_quarter', 'full')),
  exterior_condition VARCHAR(10) NULL CHECK (exterior_condition IN ('pass', 'fail')),
  interior_condition VARCHAR(10) NULL CHECK (interior_condition IN ('pass', 'fail')),
  functionality_check VARCHAR(10) NULL CHECK (functionality_check IN ('pass', 'fail')),
  tire_condition VARCHAR(10) NULL CHECK (tire_condition IN ('pass', 'fail')),
  safety_equipment VARCHAR(10) NULL CHECK (safety_equipment IN ('pass', 'fail')),
  cleanliness_interior INT NULL CHECK (cleanliness_interior BETWEEN 1 AND 5),
  cleanliness_exterior INT NULL CHECK (cleanliness_exterior BETWEEN 1 AND 5),
  smell_condition VARCHAR(20) NULL CHECK (smell_condition IN ('none', 'smoke', 'food', 'other')),
  overall_notes NVARCHAR(MAX) NULL,
  checklist_data NVARCHAR(MAX) NULL,
  accessories_present NVARCHAR(MAX) NULL,
  inspector_signature NVARCHAR(500) NULL,
  customer_signature NVARCHAR(500) NULL,
  customer_acknowledged BIT NOT NULL DEFAULT 0,
  gps_latitude DECIMAL(10,8) NULL,
  gps_longitude DECIMAL(11,8) NULL,
  reviewed_by INT NULL REFERENCES users(id),
  reviewed_at DATETIME2 NULL,
  review_notes NVARCHAR(MAX) NULL,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Damage Records
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'damage_records')
CREATE TABLE damage_records (
  id INT IDENTITY(1,1) PRIMARY KEY,
  inspection_id INT NOT NULL REFERENCES inspections(id),
  vehicle_assetnum VARCHAR(30) NOT NULL,
  diagram_view VARCHAR(10) NOT NULL CHECK (diagram_view IN ('top', 'front', 'rear', 'left', 'right')),
  diagram_x DECIMAL(6,4) NOT NULL,
  diagram_y DECIMAL(6,4) NOT NULL,
  zone VARCHAR(50) NULL,
  damage_type VARCHAR(30) NOT NULL CHECK (damage_type IN ('scratch', 'dent', 'crack', 'broken_part', 'paint_damage', 'stain', 'burn', 'missing_part', 'glass_damage', 'tire_damage', 'other')),
  severity VARCHAR(10) NOT NULL CHECK (severity IN ('minor', 'moderate', 'severe')),
  description NVARCHAR(500) NULL,
  is_pre_existing BIT NOT NULL DEFAULT 0,
  estimated_repair_cost DECIMAL(10,2) NULL,
  charge_to_customer BIT NOT NULL DEFAULT 0,
  approved_by INT NULL REFERENCES users(id),
  approved_at DATETIME2 NULL,
  repair_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (repair_status IN ('pending', 'quoted', 'approved', 'in_repair', 'completed', 'waived')),
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Photos
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'inspection_photos')
CREATE TABLE inspection_photos (
  id INT IDENTITY(1,1) PRIMARY KEY,
  inspection_id INT NOT NULL REFERENCES inspections(id),
  damage_record_id INT NULL REFERENCES damage_records(id),
  photo_type VARCHAR(30) NOT NULL CHECK (photo_type IN ('front', 'rear', 'left', 'right', 'front_left', 'front_right', 'rear_left', 'rear_right', 'interior_front', 'interior_rear', 'dashboard', 'odometer', 'fuel_gauge', 'damage_closeup', 'other')),
  file_path VARCHAR(500) NOT NULL,
  file_size INT NULL,
  captured_at DATETIME2 NULL,
  gps_latitude DECIMAL(10,8) NULL,
  gps_longitude DECIMAL(11,8) NULL,
  uploaded_by INT NOT NULL REFERENCES users(id),
  created_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_inspections_vehicle')
CREATE INDEX IX_inspections_vehicle ON inspections (vehicle_assetnum, inspection_date DESC);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_inspections_booking')
CREATE INDEX IX_inspections_booking ON inspections (booking_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_damage_records_inspection')
CREATE INDEX IX_damage_records_inspection ON damage_records (inspection_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_inspection_photos_inspection')
CREATE INDEX IX_inspection_photos_inspection ON inspection_photos (inspection_id);

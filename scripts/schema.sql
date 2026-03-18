-- Foundation tables for GBCR Platform
-- Run against GBCR_Platform database on GBITR01V

-- Branches
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'branches')
CREATE TABLE branches (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(100) NOT NULL,
  code VARCHAR(10) NOT NULL UNIQUE,
  address NVARCHAR(500) NULL,
  phone VARCHAR(20) NULL,
  email VARCHAR(255) NULL,
  is_active BIT NOT NULL DEFAULT 1,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Users
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
CREATE TABLE users (
  id INT IDENTITY(1,1) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name NVARCHAR(100) NOT NULL,
  phone VARCHAR(20) NULL,
  role VARCHAR(30) NOT NULL CHECK (role IN ('super_admin','branch_manager','customer_service','rental_officer','inspector','driver','finance')),
  branch_id INT NULL REFERENCES branches(id),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
  must_change_password BIT NOT NULL DEFAULT 1,
  last_login_at DATETIME2 NULL,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Vehicle Categories
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'vehicle_categories')
CREATE TABLE vehicle_categories (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(50) NOT NULL,
  description NVARCHAR(200) NULL,
  daily_rate DECIMAL(10,2) NULL,
  weekly_rate DECIMAL(10,2) NULL,
  monthly_rate DECIMAL(10,2) NULL,
  deposit_amount DECIMAL(10,2) NULL,
  free_km_per_day INT NOT NULL DEFAULT 0,
  excess_km_rate DECIMAL(6,2) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BIT NOT NULL DEFAULT 1,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Audit Logs
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'audit_logs')
CREATE TABLE audit_logs (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  user_id INT NULL REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT NULL,
  old_values NVARCHAR(MAX) NULL,
  new_values NVARCHAR(MAX) NULL,
  ip_address VARCHAR(45) NULL,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Index for audit log queries
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_audit_logs_entity')
CREATE INDEX IX_audit_logs_entity ON audit_logs (entity_type, entity_id, created_at);

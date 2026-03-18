-- Vehicle overrides for GBCR Platform
-- Run against GBCR_Platform database on GBITR01V

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'vehicle_overrides')
CREATE TABLE vehicle_overrides (
  id INT IDENTITY(1,1) PRIMARY KEY,
  assetnum VARCHAR(30) NOT NULL UNIQUE,
  category_id INT NULL REFERENCES vehicle_categories(id),
  availability_override VARCHAR(30) NULL CHECK (availability_override IN ('blocked', 'reserved_vip')),
  override_reason NVARCHAR(200) NULL,
  notes NVARCHAR(MAX) NULL,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_vehicle_overrides_category')
CREATE INDEX IX_vehicle_overrides_category ON vehicle_overrides (category_id);

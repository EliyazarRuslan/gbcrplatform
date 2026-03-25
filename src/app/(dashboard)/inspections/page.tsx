'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Column } from '@/components/ui/data-table';
import ResponsiveTable from '@/components/ui/responsive-table';
import FAB from '@/components/ui/fab';
import Badge from '@/components/ui/badge';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Select from '@/components/ui/select';
import Modal from '@/components/ui/modal';
import { formatDate } from '@/lib/utils';

interface Inspection {
  [key: string]: unknown;
  id: number;
  vehicle_assetnum: string;
  vehicle_regno: string;
  inspection_type: string;
  status: string;
  inspector_name: string;
  inspection_date: string;
  mileage_reading: number | null;
  fuel_level: string | null;
  damage_count: number;
  photo_count: number;
  created_at: string;
}

interface PaginationData {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const typeOptions = [
  { label: 'All Types', value: '' },
  { label: 'Pre-Rental', value: 'pre_rental' },
  { label: 'Post-Return', value: 'post_return' },
  { label: 'Ad-Hoc', value: 'ad_hoc' },
];

const statusOptions = [
  { label: 'All Statuses', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Reviewed', value: 'reviewed' },
  { label: 'Approved', value: 'approved' },
];

const typeBadgeVariant: Record<string, 'info' | 'success' | 'default'> = {
  pre_rental: 'info',
  post_return: 'success',
  ad_hoc: 'default',
};

const statusBadgeVariant: Record<string, 'default' | 'warning' | 'info' | 'success' | 'destructive'> = {
  draft: 'default',
  in_progress: 'warning',
  submitted: 'info',
  reviewed: 'info',
  approved: 'success',
  disputed: 'destructive',
};

const typeLabels: Record<string, string> = {
  pre_rental: 'Pre-Rental',
  post_return: 'Post-Return',
  ad_hoc: 'Ad-Hoc',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  in_progress: 'In Progress',
  submitted: 'Submitted',
  reviewed: 'Reviewed',
  approved: 'Approved',
  disputed: 'Disputed',
};

export default function InspectionsPage() {
  const router = useRouter();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchInspections = async (p = page, showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('pageSize', '20');
      if (search) params.set('vehicle', search);
      if (typeFilter) params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/inspections?${params}`);
      const json = await res.json();
      if (json.success) {
        setInspections(json.data.inspections);
        setPagination(json.data.pagination);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInspections(page);
  }, [page]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchInspections(page, false), 10000);
    return () => clearInterval(interval);
  }, [page, typeFilter, statusFilter, search]);

  const handleSearch = () => {
    setPage(1);
    fetchInspections(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const columns: Column<Inspection>[] = [
    {
      key: 'id',
      header: 'ID',
      sortable: true,
      render: (row) => <span className="font-medium text-primary">#{row.id}</span>,
    },
    {
      key: 'vehicle_assetnum',
      header: 'Vehicle',
      sortable: true,
      render: (row) => <span className="font-medium">{row.vehicle_assetnum}</span>,
    },
    {
      key: 'vehicle_regno',
      header: 'Reg No',
      render: (row) => row.vehicle_regno || '-',
    },
    {
      key: 'inspection_type',
      header: 'Type',
      render: (row) => (
        <Badge variant={typeBadgeVariant[row.inspection_type] || 'default'}>
          {typeLabels[row.inspection_type] || row.inspection_type}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={statusBadgeVariant[row.status] || 'default'}>
          {statusLabels[row.status] || row.status}
        </Badge>
      ),
    },
    {
      key: 'inspector_name',
      header: 'Inspector',
      render: (row) => row.inspector_name || '-',
    },
    {
      key: 'inspection_date',
      header: 'Date',
      sortable: true,
      render: (row) => formatDate(row.inspection_date),
    },
    {
      key: 'mileage_reading',
      header: 'Mileage',
      render: (row) => row.mileage_reading != null ? row.mileage_reading.toLocaleString() : '-',
    },
    {
      key: 'damage_count',
      header: 'Damages',
      render: (row) => (
        <span className={row.damage_count > 0 ? 'text-red-600 font-medium' : ''}>
          {row.damage_count}
        </span>
      ),
    },
    {
      key: 'photo_count',
      header: 'Photos',
      render: (row) => row.photo_count,
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Inspections</h1>
        <Button onClick={() => setShowCreate(true)}>New Inspection</Button>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <Input
          placeholder="Search vehicle assetnum or reg no..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-none">
          <Select
            options={typeOptions}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="shrink-0 w-44"
          />
          <Select
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="shrink-0 w-44"
          />
          <Button variant="secondary" onClick={handleSearch} className="shrink-0">
            Search
          </Button>
        </div>
      </div>

      {/* Table */}
      <ResponsiveTable<Inspection>
        columns={columns}
        data={inspections}
        loading={loading}
        emptyMessage="No inspections found. Create your first inspection to get started."
        pagination={{
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onPageChange: (p) => setPage(p),
        }}
        onRowClick={(row) => router.push(`/inspections/${row.id}`)}
        mobileCard={(row) => (
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-primary text-sm">#{row.id}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{row.vehicle_regno || row.vehicle_assetnum}</p>
              </div>
              <Badge variant={statusBadgeVariant[row.status] || 'default'}>
                {statusLabels[row.status] || row.status}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant={typeBadgeVariant[row.inspection_type] || 'default'}>
                {typeLabels[row.inspection_type] || row.inspection_type}
              </Badge>
              <span className="text-xs text-neutral-500">{formatDate(row.inspection_date)}</span>
            </div>
            {row.inspector_name && (
              <p className="text-xs text-neutral-400 mt-1">Inspector: {row.inspector_name}</p>
            )}
          </div>
        )}
      />

      {/* FAB for mobile */}
      <FAB label="New Inspection" onClick={() => setShowCreate(true)} />

      {/* Create Modal */}
      {showCreate && (
        <CreateInspectionModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            setShowCreate(false);
            router.push(`/inspections/${id}`);
          }}
        />
      )}
    </div>
  );
}

function CreateInspectionModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: number) => void;
}) {
  const [form, setForm] = useState({
    vehicle_regno: '',
    inspection_type: 'pre_rental',
    booking_id: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vehicle_regno.trim()) {
      setError('Vehicle Reg No is required');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const body: Record<string, string> = {
        vehicle_assetnum: form.vehicle_regno.trim(),
        vehicle_regno: form.vehicle_regno.trim(),
        inspection_type: form.inspection_type,
      };
      if (form.booking_id.trim()) body.booking_id = form.booking_id.trim();

      const res = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (json.success) {
        onCreated(json.data.id);
      } else {
        setError(json.error || 'Failed to create inspection');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title="New Inspection" size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <Input
          label="Vehicle Reg No"
          required
          value={form.vehicle_regno}
          onChange={(e) => setForm({ ...form, vehicle_regno: e.target.value.toUpperCase() })}
          placeholder="e.g. SBA1234A"
        />

        <Select
          label="Inspection Type"
          required
          value={form.inspection_type}
          onChange={(e) => setForm({ ...form, inspection_type: e.target.value })}
          options={[
            { label: 'Pre-Rental', value: 'pre_rental' },
            { label: 'Post-Return', value: 'post_return' },
            { label: 'Ad-Hoc', value: 'ad_hoc' },
          ]}
        />

        <Input
          label="Booking ID"
          value={form.booking_id}
          onChange={(e) => setForm({ ...form, booking_id: e.target.value })}
          placeholder="Optional"
          hint="Leave empty for standalone inspection"
        />

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
}

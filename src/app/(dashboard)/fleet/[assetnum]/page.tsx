'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';
import Badge from '@/components/ui/badge';
import Card from '@/components/ui/card';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Select from '@/components/ui/select';
import Textarea from '@/components/ui/textarea';
import { formatDate } from '@/lib/utils';

interface VehicleDetail {
  assetnum: string;
  description: string;
  status: string;
  serial_no: string | null;
  registration_no: string | null;
  model: string | null;
  colour: string | null;
  fuel_type: string | null;
  transmission: string | null;
  engine_capacity: string | null;
  year_mfg: number | null;
  chassis_no: string | null;
  insurer: string | null;
  policy_no: string | null;
  policy_expiry: string | null;
  coe_expiry: string | null;
  seating: number | null;
  tonnage: number | null;
  customer_code: string | null;
  install_date: string | null;
  purchase_price: number | null;
  change_date: string | null;
  override_id: number | null;
  category_id: number | null;
  category_name: string | null;
  availability_override: string | null;
  override_reason: string | null;
  notes: string | null;
}

interface FormState {
  category_id: string;
  availability_override: string;
  override_reason: string;
  notes: string;
}

const categoryOptions = [
  { label: 'No category', value: '' },
  { label: 'Economy Sedan', value: '1' },
  { label: 'Standard Sedan', value: '2' },
  { label: 'Premium Sedan', value: '3' },
  { label: 'SUV', value: '4' },
  { label: 'Van', value: '5' },
  { label: 'Truck (Light)', value: '6' },
  { label: 'Truck (Heavy)', value: '7' },
];

const availabilityOptions = [
  { label: 'Available (follow Maximo)', value: '' },
  { label: 'Blocked', value: 'blocked' },
  { label: 'Reserved VIP', value: 'reserved_vip' },
];

function vehicleToForm(v: VehicleDetail): FormState {
  return {
    category_id: v.category_id != null ? String(v.category_id) : '',
    availability_override: v.availability_override ?? '',
    override_reason: v.override_reason ?? '',
    notes: v.notes ?? '',
  };
}

function formsDiffer(a: FormState, b: FormState): boolean {
  return (
    a.category_id !== b.category_id ||
    a.availability_override !== b.availability_override ||
    a.override_reason !== b.override_reason ||
    a.notes !== b.notes
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[13px] font-bold text-neutral-500">{label}</p>
      <p className="text-[15px] font-semibold text-neutral-900">{value || '-'}</p>
    </div>
  );
}

export default function VehicleDetailPage({ params }: { params: Promise<{ assetnum: string }> }) {
  const { assetnum } = use(params);

  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({ category_id: '', availability_override: '', override_reason: '', notes: '' });
  const [originalForm, setOriginalForm] = useState<FormState>({ category_id: '', availability_override: '', override_reason: '', notes: '' });

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadVehicle = () => {
    setLoading(true);
    setFetchError(null);
    fetch(`/api/fleet/${assetnum}`)
      .then((r) => r.json())
      .then((res) => {
        if (!res.success) throw new Error(res.error || 'Failed to load vehicle');
        const v: VehicleDetail = res.data;
        setVehicle(v);
        const f = vehicleToForm(v);
        setForm(f);
        setOriginalForm(f);
        setLoading(false);
      })
      .catch((err) => {
        setFetchError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadVehicle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetnum]);

  const isDirty = formsDiffer(form, originalForm);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const body: Record<string, string | number | null> = {
        category_id: form.category_id !== '' ? Number(form.category_id) : null,
        availability_override: form.availability_override !== '' ? form.availability_override : null,
        override_reason: form.override_reason !== '' ? form.override_reason : null,
        notes: form.notes !== '' ? form.notes : null,
      };
      const res = await fetch(`/api/fleet/${assetnum}/overrides`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Save failed');
      setSaveSuccess(true);
      loadVehicle();
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-neutral-200 rounded w-48" />
        <div className="h-6 bg-neutral-200 rounded w-72" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-neutral-200 rounded-xl" />
          <div className="h-64 bg-neutral-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (fetchError || !vehicle) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-500">{fetchError || 'Vehicle not found'}</p>
        <Link href="/fleet" className="mt-4 inline-block text-[15px] font-medium text-primary hover:underline">← Back to Fleet</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <Link href="/fleet" className="inline-flex items-center gap-1 text-[13px] font-medium text-neutral-500 hover:text-neutral-800 transition-colors mb-3">
          ← Back to Fleet
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[26px] font-bold text-neutral-900">
            {vehicle.registration_no || vehicle.assetnum} — {vehicle.description}
          </h1>
          <div className="flex items-center gap-2">
            <StatusBadge status={vehicle.status} />
            {vehicle.category_name && (
              <Badge variant="info">{vehicle.category_name}</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column — read-only details */}
        <div className="space-y-6">
          <Card title="Vehicle Information" padding="md">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailRow label="Registration" value={vehicle.registration_no} />
              <DetailRow label="Model" value={vehicle.model} />
              <DetailRow label="Chassis No" value={vehicle.chassis_no} />
              <DetailRow label="Colour" value={vehicle.colour} />
              <DetailRow label="Fuel Type" value={vehicle.fuel_type} />
              <DetailRow label="Transmission" value={vehicle.transmission} />
              <DetailRow label="Year" value={vehicle.year_mfg} />
              <DetailRow label="Engine" value={vehicle.engine_capacity} />
              <DetailRow label="Seating" value={vehicle.seating} />
              <DetailRow label="Tonnage" value={vehicle.tonnage} />
            </div>
          </Card>

          <Card title="Insurance & Compliance" padding="md">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailRow label="Insurer" value={vehicle.insurer} />
              <DetailRow label="Policy No" value={vehicle.policy_no} />
              <DetailRow label="Policy Expiry" value={formatDate(vehicle.policy_expiry)} />
              <DetailRow label="COE Expiry" value={formatDate(vehicle.coe_expiry)} />
            </div>
          </Card>

          <Card title="Assignment" padding="md">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailRow label="Customer" value={vehicle.customer_code} />
              <DetailRow label="Install Date" value={formatDate(vehicle.install_date)} />
              <DetailRow label="Last Updated" value={formatDate(vehicle.change_date)} />
            </div>
          </Card>
        </div>

        {/* Right Column — editable rental settings */}
        <div>
          <Card title="Rental Settings" padding="md">
            <div className="space-y-4">
              <Select
                label="Category"
                options={categoryOptions}
                value={form.category_id}
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
              />

              <Select
                label="Availability"
                options={availabilityOptions}
                value={form.availability_override}
                onChange={(e) => setForm((f) => ({ ...f, availability_override: e.target.value }))}
              />

              {form.availability_override !== '' && (
                <Input
                  label="Override Reason"
                  value={form.override_reason}
                  onChange={(e) => setForm((f) => ({ ...f, override_reason: e.target.value }))}
                  placeholder="Reason for availability override"
                />
              )}

              <Textarea
                label="Notes"
                rows={4}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Internal notes about this vehicle"
              />

              <div className="pt-2 flex flex-col gap-2">
                <Button
                  variant="primary"
                  loading={saving}
                  disabled={!isDirty}
                  onClick={handleSave}
                >
                  Save Changes
                </Button>

                {saveSuccess && (
                  <p className="text-[15px] font-medium text-green-600">Changes saved successfully.</p>
                )}
                {saveError && (
                  <p className="text-[15px] font-medium text-red-600">{saveError}</p>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

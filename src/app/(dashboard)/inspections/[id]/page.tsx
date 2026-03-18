'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Badge from '@/components/ui/badge';
import Button from '@/components/ui/button';
import Card from '@/components/ui/card';
import Input from '@/components/ui/input';
import Select from '@/components/ui/select';
import Textarea from '@/components/ui/textarea';
import Spinner from '@/components/ui/spinner';
import PhotoCapture from '@/components/inspection/PhotoCapture';
import SignatureCanvas from '@/components/inspection/SignatureCanvas';
import StarRating from '@/components/inspection/StarRating';
import { formatDate } from '@/lib/utils';

// --- Types ---

interface InspectionPhoto {
  id: number;
  photo_type: string;
  photo_url: string;
}

interface InspectionDamage {
  id: number;
  view: string;
  position_x: number;
  position_y: number;
  damage_type: string;
  severity: string;
  description: string;
  pre_existing: boolean;
}

interface InspectionData {
  id: number;
  vehicle_assetnum: string;
  vehicle_regno: string;
  inspection_type: string;
  status: string;
  inspector_name: string;
  inspection_date: string;
  booking_id: number | null;
  // Checklist
  exterior_condition: string | null;
  interior_condition: string | null;
  functionality_check: string | null;
  tire_condition: string | null;
  safety_equipment: string | null;
  cleanliness_interior: number | null;
  cleanliness_exterior: number | null;
  smell: string | null;
  fuel_level: string | null;
  mileage_reading: number | null;
  overall_notes: string | null;
  // Signatures
  inspector_signature: string | null;
  customer_signature: string | null;
  customer_acknowledged: boolean;
  // Related
  damages: InspectionDamage[];
  photos: InspectionPhoto[];
}

// --- Constants ---

const PHOTO_SLOTS = [
  { type: 'front', label: 'Front' },
  { type: 'rear', label: 'Rear' },
  { type: 'left', label: 'Left' },
  { type: 'right', label: 'Right' },
  { type: 'front_left', label: 'Front-Left' },
  { type: 'front_right', label: 'Front-Right' },
  { type: 'rear_left', label: 'Rear-Left' },
  { type: 'rear_right', label: 'Rear-Right' },
  { type: 'interior_front', label: 'Interior Front' },
  { type: 'interior_rear', label: 'Interior Rear' },
  { type: 'dashboard_odometer', label: 'Dashboard/Odometer' },
  { type: 'fuel_gauge', label: 'Fuel Gauge' },
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

const damageTypeOptions = [
  { label: 'Scratch', value: 'scratch' },
  { label: 'Dent', value: 'dent' },
  { label: 'Crack', value: 'crack' },
  { label: 'Chip', value: 'chip' },
  { label: 'Stain', value: 'stain' },
  { label: 'Tear', value: 'tear' },
  { label: 'Missing Part', value: 'missing_part' },
  { label: 'Other', value: 'other' },
];

const severityOptions = [
  { label: 'Minor', value: 'minor' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'Severe', value: 'severe' },
];

const viewOptions = [
  { label: 'Top', value: 'top' },
  { label: 'Front', value: 'front' },
  { label: 'Rear', value: 'rear' },
  { label: 'Left', value: 'left' },
  { label: 'Right', value: 'right' },
];

const smellOptions = [
  { label: 'None', value: 'none' },
  { label: 'Smoke', value: 'smoke' },
  { label: 'Food', value: 'food' },
  { label: 'Other', value: 'other' },
];

const fuelLevelOptions = [
  { label: 'Empty', value: 'empty' },
  { label: 'Quarter', value: 'quarter' },
  { label: 'Half', value: 'half' },
  { label: 'Three Quarter', value: 'three_quarter' },
  { label: 'Full', value: 'full' },
];

// --- Page Component ---

export default function InspectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [data, setData] = useState<InspectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('photos');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Debounce timer ref
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/inspections/${id}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError('Failed to load inspection');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-save checklist fields (debounced)
  const autoSave = useCallback(
    (updates: Partial<InspectionData>) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        try {
          await fetch(`/api/inspections/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          });
        } catch {
          // Silently fail - data persists locally
        }
      }, 800);
    },
    [id]
  );

  const updateField = <K extends keyof InspectionData>(field: K, value: InspectionData[K]) => {
    if (!data) return;
    const updated = { ...data, [field]: value };
    setData(updated);
    autoSave({ [field]: value });
  };

  // --- Submit ---
  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch(`/api/inspections/${id}/submit`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        await fetchData();
      } else {
        setSubmitError(json.error || 'Submission failed');
      }
    } catch {
      setSubmitError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Loading / Error states ---
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-500 mb-4">{error || 'Inspection not found'}</p>
        <Link href="/inspections" className="text-primary hover:underline">
          Back to Inspections
        </Link>
      </div>
    );
  }

  const sections = [
    { id: 'photos', label: 'Photos', count: data.photos.length },
    { id: 'checklist', label: 'Checklist' },
    { id: 'damages', label: 'Damages', count: data.damages.length },
    { id: 'signatures', label: 'Notes & Signatures' },
    { id: 'submit', label: 'Submit' },
  ];

  const isEditable = ['draft', 'in_progress'].includes(data.status);

  return (
    <div className="space-y-4 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <Link
            href="/inspections"
            className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-primary transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Inspections
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-neutral-900">Inspection #{data.id}</h1>
            <Badge variant={typeBadgeVariant[data.inspection_type] || 'default'}>
              {typeLabels[data.inspection_type] || data.inspection_type}
            </Badge>
            <Badge variant={statusBadgeVariant[data.status] || 'default'}>
              {statusLabels[data.status] || data.status}
            </Badge>
          </div>
          <p className="text-sm text-neutral-500">
            Vehicle: <span className="font-medium text-neutral-700">{data.vehicle_assetnum}</span>
            {data.vehicle_regno && (
              <> &middot; <span className="font-medium text-neutral-700">{data.vehicle_regno}</span></>
            )}
            {data.inspection_date && (
              <> &middot; {formatDate(data.inspection_date)}</>
            )}
          </p>
        </div>
        {isEditable && data.status === 'in_progress' && (
          <Button onClick={handleSubmit} loading={submitting}>
            Submit Inspection
          </Button>
        )}
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors touch-manipulation ${
              activeSection === s.id
                ? 'bg-primary text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {s.label}
            {s.count !== undefined && (
              <span
                className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs ${
                  activeSection === s.id ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-600'
                }`}
              >
                {s.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Section Content */}
      {activeSection === 'photos' && (
        <PhotosSection data={data} isEditable={isEditable} onRefresh={fetchData} />
      )}
      {activeSection === 'checklist' && (
        <ChecklistSection data={data} isEditable={isEditable} updateField={updateField} />
      )}
      {activeSection === 'damages' && (
        <DamagesSection data={data} isEditable={isEditable} inspectionId={id} onRefresh={fetchData} />
      )}
      {activeSection === 'signatures' && (
        <SignaturesSection data={data} isEditable={isEditable} updateField={updateField} inspectionId={id} onRefresh={fetchData} />
      )}
      {activeSection === 'submit' && (
        <SubmitSection
          data={data}
          onSubmit={handleSubmit}
          submitting={submitting}
          submitError={submitError}
          isEditable={isEditable}
        />
      )}
    </div>
  );
}

// --- Section: Photos ---

function PhotosSection({
  data,
  isEditable,
  onRefresh,
}: {
  data: InspectionData;
  isEditable: boolean;
  onRefresh: () => void;
}) {
  const photoMap = new Map(data.photos.map((p) => [p.photo_type, p.photo_url]));

  return (
    <Card title="Vehicle Photos" description={`${data.photos.length} of ${PHOTO_SLOTS.length} photos captured`}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {PHOTO_SLOTS.map((slot) => (
          <PhotoCapture
            key={slot.type}
            photoType={slot.type}
            label={slot.label}
            existingUrl={photoMap.get(slot.type)}
            inspectionId={data.id}
            onUploaded={onRefresh}
          />
        ))}
      </div>
    </Card>
  );
}

// --- Section: Checklist ---

function PassFailToggle({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string | null;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-neutral-100 last:border-0">
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('pass')}
          className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors touch-manipulation ${
            value === 'pass'
              ? 'bg-green-100 text-green-800 ring-2 ring-green-300'
              : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Pass
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('fail')}
          className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors touch-manipulation ${
            value === 'fail'
              ? 'bg-red-100 text-red-800 ring-2 ring-red-300'
              : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Fail
        </button>
      </div>
    </div>
  );
}

function ChecklistSection({
  data,
  isEditable,
  updateField,
}: {
  data: InspectionData;
  isEditable: boolean;
  updateField: <K extends keyof InspectionData>(field: K, value: InspectionData[K]) => void;
}) {
  return (
    <div className="space-y-4">
      <Card title="Condition Checks">
        <div className="divide-y divide-neutral-100">
          <PassFailToggle
            label="Exterior Condition"
            value={data.exterior_condition}
            onChange={(v) => updateField('exterior_condition', v)}
            disabled={!isEditable}
          />
          <PassFailToggle
            label="Interior Condition"
            value={data.interior_condition}
            onChange={(v) => updateField('interior_condition', v)}
            disabled={!isEditable}
          />
          <PassFailToggle
            label="Functionality Check"
            value={data.functionality_check}
            onChange={(v) => updateField('functionality_check', v)}
            disabled={!isEditable}
          />
          <PassFailToggle
            label="Tire Condition"
            value={data.tire_condition}
            onChange={(v) => updateField('tire_condition', v)}
            disabled={!isEditable}
          />
          <PassFailToggle
            label="Safety Equipment"
            value={data.safety_equipment}
            onChange={(v) => updateField('safety_equipment', v)}
            disabled={!isEditable}
          />
        </div>
      </Card>

      <Card title="Cleanliness & Other">
        <div className="space-y-5">
          <StarRating
            label="Cleanliness Interior"
            value={data.cleanliness_interior || 0}
            onChange={(v) => updateField('cleanliness_interior', v)}
          />
          <StarRating
            label="Cleanliness Exterior"
            value={data.cleanliness_exterior || 0}
            onChange={(v) => updateField('cleanliness_exterior', v)}
          />
          <Select
            label="Smell"
            value={data.smell || 'none'}
            onChange={(e) => updateField('smell', e.target.value)}
            options={smellOptions}
            disabled={!isEditable}
          />
          <Select
            label="Fuel Level"
            value={data.fuel_level || ''}
            onChange={(e) => updateField('fuel_level', e.target.value)}
            options={fuelLevelOptions}
            placeholder="Select fuel level"
            disabled={!isEditable}
          />
          <Input
            label="Mileage Reading"
            type="number"
            value={data.mileage_reading ?? ''}
            onChange={(e) =>
              updateField('mileage_reading', e.target.value ? Number(e.target.value) : null)
            }
            placeholder="Enter odometer reading"
            disabled={!isEditable}
          />
        </div>
      </Card>
    </div>
  );
}

// --- Section: Damages ---

function DamagesSection({
  data,
  isEditable,
  inspectionId,
  onRefresh,
}: {
  data: InspectionData;
  isEditable: boolean;
  inspectionId: number;
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [form, setForm] = useState({
    view: 'top',
    position_x: 0.5,
    position_y: 0.5,
    damage_type: 'scratch',
    severity: 'minor',
    description: '',
    pre_existing: false,
  });

  const handleSaveDamage = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/inspections/${inspectionId}/damages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ view: 'top', position_x: 0.5, position_y: 0.5, damage_type: 'scratch', severity: 'minor', description: '', pre_existing: false });
        onRefresh();
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (damageId: number) => {
    if (!window.confirm('Delete this damage record?')) return;
    setDeleting(damageId);
    try {
      const res = await fetch(`/api/inspections/${inspectionId}/damages/${damageId}`, {
        method: 'DELETE',
      });
      if (res.ok) onRefresh();
    } catch {
      // silently fail
    } finally {
      setDeleting(null);
    }
  };

  const severityColor: Record<string, string> = {
    minor: 'bg-yellow-100 text-yellow-800',
    moderate: 'bg-orange-100 text-orange-800',
    severe: 'bg-red-100 text-red-800',
  };

  return (
    <Card
      title="Vehicle Damage"
      description={`${data.damages.length} damage${data.damages.length !== 1 ? 's' : ''} recorded`}
      actions={
        isEditable && (
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : 'Add Damage'}
          </Button>
        )
      }
    >
      <div className="space-y-4">
        {/* Add Damage Form */}
        {showForm && (
          <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="View"
                value={form.view}
                onChange={(e) => setForm({ ...form, view: e.target.value })}
                options={viewOptions}
              />
              <Select
                label="Type"
                value={form.damage_type}
                onChange={(e) => setForm({ ...form, damage_type: e.target.value })}
                options={damageTypeOptions}
              />
              <Select
                label="Severity"
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value })}
                options={severityOptions}
              />
              <div className="space-y-3">
                <Input
                  label="Position X"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={form.position_x}
                  onChange={(e) => setForm({ ...form, position_x: parseFloat(e.target.value) })}
                />
                <Input
                  label="Position Y"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={form.position_y}
                  onChange={(e) => setForm({ ...form, position_y: parseFloat(e.target.value) })}
                />
              </div>
            </div>
            <Textarea
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the damage..."
              rows={2}
            />
            <label className="flex items-center gap-2 cursor-pointer touch-manipulation">
              <input
                type="checkbox"
                checked={form.pre_existing}
                onChange={(e) => setForm({ ...form, pre_existing: e.target.checked })}
                className="w-5 h-5 rounded border-neutral-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-neutral-700">Pre-existing damage</span>
            </label>
            <div className="flex justify-end">
              <Button onClick={handleSaveDamage} loading={saving} size="sm">
                Save Damage
              </Button>
            </div>
          </div>
        )}

        {/* Damage List */}
        {data.damages.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-8">
            No damages recorded. {isEditable ? 'Tap "Add Damage" to record damage.' : ''}
          </p>
        ) : (
          <div className="space-y-3">
            {data.damages.map((d) => (
              <div
                key={d.id}
                className="flex items-start justify-between p-4 bg-white border border-neutral-200 rounded-lg"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-neutral-900 capitalize">
                      {d.damage_type.replace('_', ' ')}
                    </span>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        severityColor[d.severity] || 'bg-neutral-100 text-neutral-700'
                      }`}
                    >
                      {d.severity}
                    </span>
                    <span className="text-xs text-neutral-400 capitalize">{d.view} view</span>
                    {d.pre_existing && (
                      <Badge variant="warning" size="sm">
                        Pre-existing
                      </Badge>
                    )}
                  </div>
                  {d.description && (
                    <p className="text-sm text-neutral-600">{d.description}</p>
                  )}
                </div>
                {isEditable && (
                  <button
                    onClick={() => handleDelete(d.id)}
                    disabled={deleting === d.id}
                    className="ml-3 p-2 text-neutral-400 hover:text-red-600 transition-colors touch-manipulation shrink-0"
                    aria-label="Delete damage"
                  >
                    {deleting === d.id ? (
                      <Spinner size="sm" />
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

// --- Section: Notes & Signatures ---

function SignaturesSection({
  data,
  isEditable,
  updateField,
  inspectionId,
  onRefresh,
}: {
  data: InspectionData;
  isEditable: boolean;
  updateField: <K extends keyof InspectionData>(field: K, value: InspectionData[K]) => void;
  inspectionId: number;
  onRefresh: () => void;
}) {
  const saveSignature = async (field: 'inspector_signature' | 'customer_signature', dataUrl: string) => {
    try {
      const body: Record<string, string | boolean> = { [field]: dataUrl };
      if (field === 'customer_signature') {
        body.customer_acknowledged = true;
      }
      await fetch(`/api/inspections/${inspectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      onRefresh();
    } catch {
      // silently fail
    }
  };

  return (
    <div className="space-y-4">
      <Card title="Overall Notes">
        <Textarea
          value={data.overall_notes || ''}
          onChange={(e) => updateField('overall_notes', e.target.value)}
          placeholder="Add any overall notes about the inspection..."
          rows={4}
          disabled={!isEditable}
        />
      </Card>

      <Card title="Inspector Signature">
        <SignatureCanvas
          onSave={(url) => saveSignature('inspector_signature', url)}
          existingSignature={data.inspector_signature || undefined}
        />
      </Card>

      <Card title="Customer Signature">
        {data.customer_acknowledged && data.customer_signature ? (
          <div className="space-y-2">
            <div className="border border-neutral-200 rounded-lg p-4 bg-neutral-50">
              <img src={data.customer_signature} alt="Customer signature" className="max-h-32 mx-auto" />
            </div>
            <Badge variant="success">Customer Acknowledged</Badge>
          </div>
        ) : (
          <SignatureCanvas
            onSave={(url) => saveSignature('customer_signature', url)}
            existingSignature={data.customer_signature || undefined}
          />
        )}
      </Card>
    </div>
  );
}

// --- Section: Submit ---

function SubmitSection({
  data,
  onSubmit,
  submitting,
  submitError,
  isEditable,
}: {
  data: InspectionData;
  onSubmit: () => void;
  submitting: boolean;
  submitError: string;
  isEditable: boolean;
}) {
  const photoCount = data.photos.length;
  const checklistFields = [
    data.exterior_condition,
    data.interior_condition,
    data.functionality_check,
    data.tire_condition,
    data.safety_equipment,
  ];
  const checklistFilled = checklistFields.filter(Boolean).length;
  const hasMileage = data.mileage_reading != null;
  const hasFuel = !!data.fuel_level;
  const hasInspectorSig = !!data.inspector_signature;

  const completionItems = [
    { label: 'Photos captured', value: `${photoCount}/${PHOTO_SLOTS.length}`, ok: photoCount >= PHOTO_SLOTS.length },
    { label: 'Checklist items', value: `${checklistFilled}/5`, ok: checklistFilled === 5 },
    { label: 'Mileage reading', value: hasMileage ? 'Recorded' : 'Missing', ok: hasMileage },
    { label: 'Fuel level', value: hasFuel ? 'Recorded' : 'Missing', ok: hasFuel },
    { label: 'Inspector signature', value: hasInspectorSig ? 'Signed' : 'Missing', ok: hasInspectorSig },
    { label: 'Damages recorded', value: String(data.damages.length), ok: true },
  ];

  if (!isEditable) {
    return (
      <Card title="Inspection Submitted">
        <p className="text-sm text-neutral-500">
          This inspection has been submitted and is no longer editable.
          Current status: <Badge variant={statusBadgeVariant[data.status] || 'default'}>{statusLabels[data.status] || data.status}</Badge>
        </p>
      </Card>
    );
  }

  return (
    <Card title="Submit Inspection" description="Review completion status before submitting">
      <div className="space-y-4">
        <div className="space-y-2">
          {completionItems.map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
              <span className="text-sm text-neutral-700">{item.label}</span>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${item.ok ? 'text-green-700' : 'text-amber-600'}`}>
                  {item.value}
                </span>
                {item.ok ? (
                  <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                )}
              </div>
            </div>
          ))}
        </div>

        {submitError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {submitError}
          </div>
        )}

        <Button onClick={onSubmit} loading={submitting} size="lg" className="w-full">
          Submit Inspection
        </Button>
      </div>
    </Card>
  );
}

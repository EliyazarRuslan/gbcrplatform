'use client';

import { useState } from 'react';

type DiagramView = 'top' | 'front' | 'rear' | 'left' | 'right';

interface DamagePin {
  id?: number;
  diagram_view: DiagramView;
  diagram_x: number;
  diagram_y: number;
  damage_type: string;
  severity: string;
  description?: string;
  is_pre_existing: boolean;
}

interface VehicleDiagramProps {
  damages: DamagePin[];
  onAddDamage: (view: DiagramView, x: number, y: number) => void;
  onSelectDamage: (damage: DamagePin) => void;
  activeView: DiagramView;
  onViewChange: (view: DiagramView) => void;
}

const VIEW_LABELS: Record<DiagramView, string> = {
  top: 'Top View',
  front: 'Front View',
  rear: 'Rear View',
  left: 'Left Side',
  right: 'Right Side',
};

const SEVERITY_COLORS = {
  minor: '#d97706',
  moderate: '#ea580c',
  severe: '#dc2626',
};

export default function VehicleDiagram({ damages, onAddDamage, onSelectDamage, activeView, onViewChange }: VehicleDiagramProps) {
  const viewDamages = damages.filter(d => d.diagram_view === activeView);

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    onAddDamage(activeView, parseFloat(x.toFixed(4)), parseFloat(y.toFixed(4)));
  };

  return (
    <div className="space-y-3">
      {/* View selector tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {(Object.keys(VIEW_LABELS) as DiagramView[]).map(view => (
          <button
            key={view}
            onClick={() => onViewChange(view)}
            className={`px-3 py-2 text-sm rounded-lg whitespace-nowrap transition-colors ${
              activeView === view
                ? 'bg-primary text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {VIEW_LABELS[view]}
            {damages.filter(d => d.diagram_view === view).length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs">
                {damages.filter(d => d.diagram_view === view).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Vehicle SVG with damage pins */}
      <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4">
        <p className="text-xs text-neutral-500 mb-2 text-center">Tap on the diagram to mark damage</p>
        <svg
          viewBox="0 0 400 250"
          className="w-full cursor-crosshair"
          onClick={handleSvgClick}
          style={{ touchAction: 'manipulation' }}
        >
          {/* Vehicle outline based on active view */}
          {activeView === 'top' && <TopView />}
          {activeView === 'front' && <FrontView />}
          {activeView === 'rear' && <RearView />}
          {activeView === 'left' && <SideView />}
          {activeView === 'right' && <SideView mirrored />}

          {/* Damage pins */}
          {viewDamages.map((d, i) => (
            <g
              key={d.id || i}
              transform={`translate(${d.diagram_x * 400}, ${d.diagram_y * 250})`}
              onClick={(e) => { e.stopPropagation(); onSelectDamage(d); }}
              className="cursor-pointer"
            >
              <circle r="12" fill={d.is_pre_existing ? '#16a34a' : (SEVERITY_COLORS[d.severity as keyof typeof SEVERITY_COLORS] || '#dc2626')} opacity="0.9" />
              <circle r="12" fill="none" stroke="white" strokeWidth="2" />
              <text x="0" y="1" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="10" fontWeight="bold">
                {i + 1}
              </text>
            </g>
          ))}
        </svg>

        {/* Legend */}
        <div className="flex gap-4 justify-center mt-2 text-xs text-neutral-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-green-600 inline-block" /> Pre-existing
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-amber-600 inline-block" /> Minor
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-orange-600 inline-block" /> Moderate
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-600 inline-block" /> Severe
          </span>
        </div>
      </div>
    </div>
  );
}

// --- SVG Vehicle Outlines ---

function TopView() {
  return (
    <g stroke="#94a3b8" strokeWidth="1.5" fill="#f8fafc">
      {/* Car body outline - top view */}
      <path d="M140,30 L260,30 Q280,30 285,50 L295,80 Q300,95 300,110 L300,170 Q300,185 295,200 L285,220 Q280,230 260,230 L140,230 Q120,230 115,220 L105,200 Q100,185 100,170 L100,110 Q100,95 105,80 L115,50 Q120,30 140,30 Z" />
      {/* Windshield */}
      <path d="M145,65 L255,65 L270,100 L130,100 Z" fill="#dbeafe" stroke="#94a3b8" />
      {/* Rear window */}
      <path d="M150,195 L250,195 L260,170 L140,170 Z" fill="#dbeafe" stroke="#94a3b8" />
      {/* Roof */}
      <rect x="135" y="105" width="130" height="60" rx="8" fill="#e2e8f0" stroke="#94a3b8" />
      {/* Side mirrors */}
      <ellipse cx="95" cy="85" rx="10" ry="6" fill="#e2e8f0" />
      <ellipse cx="305" cy="85" rx="10" ry="6" fill="#e2e8f0" />
      {/* Wheels */}
      <rect x="88" y="55" width="18" height="30" rx="4" fill="#64748b" />
      <rect x="294" y="55" width="18" height="30" rx="4" fill="#64748b" />
      <rect x="88" y="175" width="18" height="30" rx="4" fill="#64748b" />
      <rect x="294" y="175" width="18" height="30" rx="4" fill="#64748b" />
    </g>
  );
}

function FrontView() {
  return (
    <g stroke="#94a3b8" strokeWidth="1.5" fill="#f8fafc">
      {/* Car body - front view */}
      <path d="M100,230 L100,140 Q100,120 120,110 L140,80 Q155,55 200,55 Q245,55 260,80 L280,110 Q300,120 300,140 L300,230 Z" />
      {/* Windshield */}
      <path d="M145,78 L255,78 L275,115 L125,115 Z" fill="#dbeafe" stroke="#94a3b8" />
      {/* Grille */}
      <rect x="140" y="170" width="120" height="25" rx="4" fill="#e2e8f0" stroke="#94a3b8" />
      {/* Headlights */}
      <ellipse cx="120" cy="160" rx="18" ry="14" fill="#fef9c3" stroke="#94a3b8" />
      <ellipse cx="280" cy="160" rx="18" ry="14" fill="#fef9c3" stroke="#94a3b8" />
      {/* Bumper */}
      <rect x="105" y="200" width="190" height="20" rx="6" fill="#e2e8f0" stroke="#94a3b8" />
      {/* Wheels */}
      <rect x="90" y="215" width="35" height="20" rx="6" fill="#64748b" />
      <rect x="275" y="215" width="35" height="20" rx="6" fill="#64748b" />
      {/* Number plate */}
      <rect x="165" y="205" width="70" height="12" rx="2" fill="white" stroke="#94a3b8" />
    </g>
  );
}

function RearView() {
  return (
    <g stroke="#94a3b8" strokeWidth="1.5" fill="#f8fafc">
      {/* Car body - rear view */}
      <path d="M100,230 L100,140 Q100,120 120,110 L140,85 Q155,65 200,65 Q245,65 260,85 L280,110 Q300,120 300,140 L300,230 Z" />
      {/* Rear window */}
      <path d="M150,83 L250,83 L270,115 L130,115 Z" fill="#dbeafe" stroke="#94a3b8" />
      {/* Trunk */}
      <rect x="130" y="120" width="140" height="40" rx="4" fill="#e2e8f0" stroke="#94a3b8" />
      {/* Tail lights */}
      <rect x="105" y="150" width="25" height="30" rx="4" fill="#fca5a5" stroke="#94a3b8" />
      <rect x="270" y="150" width="25" height="30" rx="4" fill="#fca5a5" stroke="#94a3b8" />
      {/* Bumper */}
      <rect x="105" y="200" width="190" height="20" rx="6" fill="#e2e8f0" stroke="#94a3b8" />
      {/* Wheels */}
      <rect x="90" y="215" width="35" height="20" rx="6" fill="#64748b" />
      <rect x="275" y="215" width="35" height="20" rx="6" fill="#64748b" />
      {/* Number plate */}
      <rect x="165" y="185" width="70" height="12" rx="2" fill="white" stroke="#94a3b8" />
      {/* Exhaust */}
      <ellipse cx="160" cy="225" rx="10" ry="5" fill="#94a3b8" />
    </g>
  );
}

function SideView({ mirrored }: { mirrored?: boolean }) {
  return (
    <g stroke="#94a3b8" strokeWidth="1.5" fill="#f8fafc" transform={mirrored ? 'translate(400,0) scale(-1,1)' : undefined}>
      {/* Car body - side view */}
      <path d="M50,180 L50,140 L80,140 L100,80 Q120,55 170,55 L240,55 Q270,55 280,70 L310,100 Q330,110 340,130 L350,150 L350,180 Z" />
      {/* Windows */}
      <path d="M105,82 L170,62 L240,62 Q260,62 270,72 L300,100 L105,100 Z" fill="#dbeafe" stroke="#94a3b8" />
      {/* Window divider (B-pillar) */}
      <line x1="200" y1="62" x2="200" y2="100" stroke="#94a3b8" strokeWidth="3" />
      {/* Door line */}
      <line x1="200" y1="100" x2="200" y2="175" stroke="#94a3b8" strokeWidth="1" />
      {/* Door handle */}
      <rect x="210" y="120" width="20" height="5" rx="2" fill="#94a3b8" />
      {/* Front wheel */}
      <circle cx="110" cy="185" r="28" fill="#475569" stroke="#64748b" strokeWidth="2" />
      <circle cx="110" cy="185" r="12" fill="#94a3b8" />
      {/* Rear wheel */}
      <circle cx="290" cy="185" r="28" fill="#475569" stroke="#64748b" strokeWidth="2" />
      <circle cx="290" cy="185" r="12" fill="#94a3b8" />
      {/* Bumpers */}
      <rect x="35" y="155" width="20" height="25" rx="4" fill="#e2e8f0" stroke="#94a3b8" />
      <rect x="345" y="155" width="20" height="25" rx="4" fill="#e2e8f0" stroke="#94a3b8" />
      {/* Side mirror */}
      <ellipse cx="80" cy="95" rx="8" ry="5" fill="#e2e8f0" stroke="#94a3b8" />
      {/* Headlight */}
      <rect x="40" y="135" width="15" height="18" rx="3" fill="#fef9c3" stroke="#94a3b8" />
      {/* Tail light */}
      <rect x="345" y="135" width="10" height="18" rx="3" fill="#fca5a5" stroke="#94a3b8" />
    </g>
  );
}

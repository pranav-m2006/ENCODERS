import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { RescueResource, PublicCamp } from '../../lib/types';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Ship, Navigation, AlertTriangle, Send, Phone, MapPin, Compass, Truck, Plane } from 'lucide-react';

const createRescueIcon = (type: string, status: string) => {
  const bg = status === 'in_transit' ? 'bg-sky-600' : (status === 'busy' ? 'bg-amber-500' : 'bg-emerald-600');
  return L.divIcon({
    className: 'rescue-unit-marker',
    html: `
      <div class="${bg} text-white font-bold text-[10px] w-8 h-8 rounded-2xl flex items-center justify-center border-2 border-white shadow-lg animate-pulse">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/><path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/><path d="M12 10v4"/><path d="M12 2v3"/></svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

const CHENNAI_ZONES_OPTIONS = [
  { id: "velachery", name: "Velachery & Pallikaranai" },
  { id: "mudichur", name: "Mudichur & Varadharajapuram" },
  { id: "saidapet", name: "Saidapet (Adyar Basin)" },
  { id: "perumbakkam", name: "Perumbakkam & Medavakkam" },
  { id: "kolathur", name: "Kolathur & Villivakkam" },
  { id: "sholinganallur", name: "Sholinganallur / OMR" },
  { id: "tnagar", name: "T. Nagar / Mambalam" }
];

export const SituationMapPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedUnit, setSelectedUnit] = useState<RescueResource | null>(null);
  const [targetZone, setTargetZone] = useState('velachery');

  const { data: rescueUnits } = useQuery<RescueResource[]>({
    queryKey: ['rescueUnits'],
    queryFn: () => api.get<RescueResource[]>('/authority/rescue-units')
  });

  const { data: camps } = useQuery<PublicCamp[]>({
    queryKey: ['camps'],
    queryFn: () => api.get<PublicCamp[]>('/public/camps')
  });

  const handleDispatch = async () => {
    if (!selectedUnit) return;
    try {
      await api.post('/authority/rescue/dispatch', {
        unit_id: selectedUnit.resource_id,
        zone_id: targetZone
      });
      setSelectedUnit(null);
      queryClient.invalidateQueries();
    } catch (err: any) {
      alert(err.message || 'Dispatch failed');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-sky-100 shadow-soft">
        <div>
          <h2 className="text-lg font-bold font-heading text-slate-900 flex items-center gap-2">
            <Compass className="w-5 h-5 text-ocean" />
            Greater Chennai Tactical Fleet & Dispatch Map
          </h2>
          <p className="text-xs text-slate-500">
            Real-time GPS positions of NDRF, SDRF, Coast Guard Boats, and Air Force supply units with instant click-to-dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="mint" size="md" dot>6 Tactical Units Live</Badge>
        </div>
      </div>

      {/* Main Map & Side Dispatch Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 h-[620px] rounded-3xl overflow-hidden border border-sky-200 shadow-soft relative">
          <MapContainer
            center={[13.010, 80.210]} // Centered on Chennai
            zoom={12}
            className="w-full h-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Rescue Boats on Map */}
            {rescueUnits?.map((unit) => (
              <Marker
                key={unit.resource_id}
                position={[unit.lat, unit.lng]}
                icon={createRescueIcon(unit.type, unit.status)}
                eventHandlers={{
                  click: () => setSelectedUnit(unit)
                }}
              >
                <Popup>
                  <div className="p-2 min-w-[200px] text-xs">
                    <p className="font-extrabold text-slate-900">{unit.name}</p>
                    <p className="text-slate-500 mt-0.5">Capacity: {unit.capacity} evacuees ({unit.personnel || 8} personnel)</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-bold text-ocean">Status: {unit.status}</span>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setSelectedUnit(unit)}
                      >
                        Dispatch
                      </Button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Dispatch Side Panel */}
        <div className="space-y-4">
          <Card className="p-5 border border-sky-200 shadow-soft rounded-2xl">
            <h3 className="font-bold text-sm text-slate-900 font-heading mb-3 flex items-center gap-2">
              <Ship className="w-4 h-4 text-ocean" />
              Tactical Boat / Unit Dispatch
            </h3>

            {selectedUnit ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-sky-50 rounded-xl border border-sky-200">
                  <span className="font-extrabold text-deep text-sm block">{selectedUnit.name}</span>
                  <span className="text-slate-600 block mt-0.5">Type: <strong>{selectedUnit.type}</strong></span>
                  <span className="text-slate-600 block">Capacity: <strong>{selectedUnit.capacity} seats</strong> ({selectedUnit.personnel || 8} rescuers)</span>
                  <span className="text-slate-600 block">Status: <strong className="uppercase text-ocean">{selectedUnit.status}</strong></span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Neighborhood:</label>
                  <select
                    value={targetZone}
                    onChange={(e) => setTargetZone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    {CHENNAI_ZONES_OPTIONS.map((z) => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  onClick={handleDispatch}
                  icon={<Send className="w-4 h-4" />}
                  className="w-full justify-center"
                >
                  Authorize Dispatch Order
                </Button>

                <button
                  onClick={() => setSelectedUnit(null)}
                  className="w-full text-xs text-slate-400 hover:text-slate-600 text-center"
                >
                  Cancel Selection
                </button>
              </div>
            ) : (
              <div className="text-xs text-slate-500 space-y-3">
                <p>Click on any boat or tactical rescue marker on the Chennai map to issue real-time re-deployment orders.</p>
                <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 font-medium">
                  <div className="flex justify-between">
                    <span>Available Boats:</span>
                    <strong className="text-emerald-600">3 units</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>In Transit:</span>
                    <strong className="text-ocean">1 unit</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Engaged (Busy):</span>
                    <strong className="text-amber-600">2 units</strong>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

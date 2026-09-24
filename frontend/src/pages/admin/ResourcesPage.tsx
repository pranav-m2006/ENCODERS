import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { ResourceItem } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Package, Droplets, Utensils, HeartPulse, Bed, Fuel, AlertTriangle, Plus, Check } from 'lucide-react';

export const ResourcesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [supplyModal, setSupplyModal] = useState<string | null>(null);
  const [itemType, setItemType] = useState('water');
  const [quantity, setQuantity] = useState(2000);

  const { data: resources } = useQuery<ResourceItem[]>({
    queryKey: ['resources'],
    queryFn: () => api.get<ResourceItem[]>('/authority/resources')
  });

  const handleCreateSupplyRequest = async () => {
    if (!supplyModal) return;
    try {
      await api.post('/authority/supply-requests', {
        camp_id: supplyModal,
        item: itemType,
        quantity: Number(quantity)
      });
      setSupplyModal(null);
      queryClient.invalidateQueries();
    } catch (err: any) {
      alert(err.message || 'Supply request failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-sky-100 shadow-soft">
        <div>
          <h2 className="text-xl font-extrabold font-heading text-slate-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-ocean" />
            Relief Supply Inventory & Hours of Cover
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Dynamic life-support burn rate analysis calculated from live camp occupancy numbers
          </p>
        </div>
      </div>

      {/* Grid of Camps Resource Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {resources?.map((res) => (
          <Card key={res.camp_id} className="p-5 border border-sky-100 shadow-soft space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 font-heading">{res.camp_name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Current Inhabitants: {res.occupancy}</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSupplyModal(res.camp_id)}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                Supply Request
              </Button>
            </div>

            {/* Inventory Items Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              {/* Food */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-1.5 text-orange-600 font-bold mb-1">
                  <Utensils className="w-4 h-4" /> Food (Meals)
                </div>
                <p className="text-base font-extrabold text-slate-900">{res.stock.food}</p>
                <span className="text-[11px] text-slate-500">Cover: <strong>{res.hours_of_cover.food}h</strong></span>
              </div>

              {/* Water */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-1.5 text-ocean font-bold mb-1">
                  <Droplets className="w-4 h-4" /> Water (Liters)
                </div>
                <p className="text-base font-extrabold text-slate-900">{res.stock.water}</p>
                <span className="text-[11px] text-slate-500">Cover: <strong>{res.hours_of_cover.water}h</strong></span>
              </div>

              {/* Medicine */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-1.5 text-emerald-600 font-bold mb-1">
                  <HeartPulse className="w-4 h-4" /> Medical Kits
                </div>
                <p className="text-base font-extrabold text-slate-900">{res.stock.medicine}</p>
                <span className="text-[11px] text-slate-500">Cover: <strong>{res.hours_of_cover.medicine}h</strong></span>
              </div>

              {/* Beds */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-1.5 text-purple-600 font-bold mb-1">
                  <Bed className="w-4 h-4" /> Beds / Cots
                </div>
                <p className="text-base font-extrabold text-slate-900">{res.stock.beds}</p>
                <span className="text-[11px] text-slate-500">Occupants: {res.occupancy}</span>
              </div>

              {/* Fuel */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-1.5 text-amber-600 font-bold mb-1">
                  <Fuel className="w-4 h-4" /> Fuel (Liters)
                </div>
                <p className="text-base font-extrabold text-slate-900">{res.stock.fuel}</p>
                <span className="text-[11px] text-slate-500">Cover: <strong>{res.hours_of_cover.fuel}h</strong></span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Supply Request Modal */}
      {supplyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <h3 className="font-extrabold text-base text-slate-900 font-heading">
              Create Emergency Supply Request
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Item:</label>
                <select
                  value={itemType}
                  onChange={(e) => setItemType(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="water">Drinking Water (Liters)</option>
                  <option value="food">Ready-to-Eat Meals (Units)</option>
                  <option value="medicine">Medical Trauma Kits (Kits)</option>
                  <option value="beds">Beds / Cots</option>
                  <option value="fuel">Generator Diesel Fuel (Liters)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Quantity Requested:</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSupplyModal(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateSupplyRequest}
              >
                Submit Supply Requisition
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

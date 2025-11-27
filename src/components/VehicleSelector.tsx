import { Car, Bike } from 'lucide-react';
import type { VehicleType } from '../lib/accidentDetection';

interface VehicleSelectorProps {
  selectedVehicle: VehicleType;
  onVehicleChange: (vehicle: VehicleType) => void;
}

export default function VehicleSelector({ selectedVehicle, onVehicleChange }: VehicleSelectorProps) {
  return (
    <div className="flex items-center gap-2 bg-white rounded-lg shadow-md p-2 border border-gray-200">
      <button
        onClick={() => onVehicleChange('scooter')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
          selectedVehicle === 'scooter'
            ? 'bg-blue-600 text-white shadow-md'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        <Bike className="w-5 h-5" />
        <span className="hidden sm:inline">Scooter</span>
      </button>
      <button
        onClick={() => onVehicleChange('car')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
          selectedVehicle === 'car'
            ? 'bg-blue-600 text-white shadow-md'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        <Car className="w-5 h-5" />
        <span className="hidden sm:inline">Car</span>
      </button>
    </div>
  );
}

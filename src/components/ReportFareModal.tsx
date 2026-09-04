import React, { useState } from 'react';
import { 
  X, 
  DollarSign, 
  Check, 
  AlertCircle, 
  Clock, 
  Sparkles,
  Coins,
  Car
} from 'lucide-react';
import { useOfflineStore } from '../hooks/useOfflineStore';
import { RouteItem, Currency } from '../types';

interface ReportFareModalProps {
  route: RouteItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const VEHICLE_OPTIONS = [
  'Toyota HiAce Kombi (15-seater)',
  'Minibus / Coaster (18–24 seater)',
  'ZUPCO Big Bus (65–75 seater)',
  'Mushikashika (Wish / Sienta)',
  'Shared Sedan / Probox',
  'Metered Taxi / Cab',
];

const DEPARTURE_OPTIONS = [
  'Loading right now (Filling fast)',
  'Departing in 5–10 mins',
  'Full & Leaving right now',
  'Continuous high-frequency loading',
  'Long queue / Slow loading at rank',
];

export const ReportFareModal: React.FC<ReportFareModalProps> = ({
  route,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const store = useOfflineStore();
  const [currency, setCurrency] = useState<Currency>('USD');
  const [amount, setAmount] = useState<string>('0.50');
  const [transportType, setTransportType] = useState<string>(
    route.commonVehicle || VEHICLE_OPTIONS[0]
  );
  const [departureStatus, setDepartureStatus] = useState<string>(DEPARTURE_OPTIONS[0]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  // Preset buttons for fast 2-tap reporting
  const usdPresets = ['0.50', '0.75', '1.00', '1.50', '2.00'];
  const zwlPresets = ['15', '20', '25', '30', '40'];

  const handleCurrencyChange = (newCurr: Currency) => {
    setCurrency(newCurr);
    if (newCurr === 'USD' && !usdPresets.includes(amount)) {
      setAmount('0.50');
    } else if (newCurr === 'ZWL' && !zwlPresets.includes(amount)) {
      setAmount('20');
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      setErrorMessage('Please enter a valid fare amount.');
      return;
    }

    const res = store.reportFare(route.id, parsed, currency, transportType, departureStatus);
    if (!res.success) {
      setErrorMessage(res.error || 'Failed to submit fare report.');
      return;
    }

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      if (onSuccess) onSuccess();
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white border-2 border-[#141414] shadow-[8px_8px_0px_0px_#141414] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-[#141414] text-white border-b-2 border-[#141414] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-[#F27D26] uppercase tracking-widest">Crowdsource Live Fare</span>
            <h3 className="text-lg font-black text-white uppercase">{route.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white text-[#141414] hover:bg-[#F27D26] hover:text-white border-2 border-[#141414] flex items-center justify-center transition font-black cursor-pointer shadow-[2px_2px_0px_0px_#F27D26]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center bg-[#F5F5F0]">
            <div className="w-16 h-16 bg-[#141414] text-[#F27D26] border-2 border-[#141414] shadow-[4px_4px_0px_0px_#F27D26] flex items-center justify-center mx-auto mb-4 animate-bounce">
              <Check className="w-9 h-9 stroke-[3]" />
            </div>
            <h4 className="text-xl font-black text-[#141414] uppercase">Fare Reported &amp; Queued!</h4>
            <p className="text-xs font-bold text-stone-600 mt-1 max-w-xs mx-auto">
              Stored in local cache and placed in Outbox for background sync.
            </p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Currency Switcher */}
            <div>
              <label className="block text-xs font-black text-[#141414] uppercase tracking-wider mb-2">Select Currency</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleCurrencyChange('USD')}
                  className={`py-2.5 px-3 text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-1.5 border-2 border-[#141414] cursor-pointer ${
                    currency === 'USD'
                      ? 'bg-[#141414] text-white shadow-[3px_3px_0px_0px_#F27D26]'
                      : 'bg-[#F5F5F0] text-[#141414] hover:bg-white'
                  }`}
                >
                  <DollarSign className="w-4 h-4 text-[#F27D26]" />
                  <span>USD ($)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCurrencyChange('ZWL')}
                  className={`py-2.5 px-3 text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-1.5 border-2 border-[#141414] cursor-pointer ${
                    currency === 'ZWL'
                      ? 'bg-[#141414] text-white shadow-[3px_3px_0px_0px_#F27D26]'
                      : 'bg-[#F5F5F0] text-[#141414] hover:bg-white'
                  }`}
                >
                  <Coins className="w-4 h-4 text-[#F27D26]" />
                  <span>ZiG / ZWL</span>
                </button>
              </div>
            </div>

            {/* Quick 1-Tap Preset Amounts */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-black text-[#141414] uppercase tracking-wider">Quick Amount Selection</label>
                <span className="text-[10px] font-black uppercase text-stone-500">Common Fares</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {(currency === 'USD' ? usdPresets : zwlPresets).map((val) => {
                  const isSelected = amount === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(val)}
                      className={`py-2.5 px-1 text-xs font-black uppercase border-2 border-[#141414] transition cursor-pointer ${
                        isSelected
                          ? 'bg-[#F27D26] text-white shadow-[3px_3px_0px_0px_#141414] scale-105'
                          : 'bg-[#F5F5F0] text-[#141414] hover:bg-white shadow-[2px_2px_0px_0px_#141414]'
                      }`}
                    >
                      {currency === 'USD' ? `$${val}` : `${val}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Amount Input */}
            <div>
              <label className="block text-xs font-black text-[#141414] uppercase tracking-wider mb-1.5">
                Or enter custom fare
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#141414] font-black text-base">
                  {currency === 'USD' ? '$' : 'ZiG'}
                </div>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-14 pr-4 py-2.5 bg-[#F5F5F0] text-[#141414] font-black text-lg border-2 border-[#141414] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
                />
              </div>
            </div>

            {/* Transport Type Carrying Passengers Currently */}
            <div>
              <label className="block text-xs font-black text-[#141414] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-[#F27D26]" />
                <span>Vehicle Type Loading Now</span>
              </label>
              <select
                value={transportType}
                onChange={(e) => setTransportType(e.target.value)}
                className="w-full p-2.5 bg-[#F5F5F0] border-2 border-[#141414] font-black text-xs uppercase focus:bg-white focus:outline-none"
              >
                {VEHICLE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Departure Status / Loading */}
            <div>
              <label className="block text-xs font-black text-[#141414] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#F27D26]" />
                <span>Current Loading / Departure Status</span>
              </label>
              <select
                value={departureStatus}
                onChange={(e) => setDepartureStatus(e.target.value)}
                className="w-full p-2.5 bg-[#F5F5F0] border-2 border-[#141414] font-black text-xs focus:bg-white focus:outline-none"
              >
                {DEPARTURE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-100 text-rose-950 font-black text-xs flex items-center gap-2 border-2 border-[#141414]">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-700" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleSubmit()}
                className="w-full py-3.5 bg-[#141414] hover:bg-[#F27D26] text-white font-black text-sm uppercase tracking-wider border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414] hover:shadow-[6px_6px_0px_0px_#141414] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Confirm &amp; Submit Fare</span>
                <span className="bg-[#F27D26] text-white px-2.5 py-0.5 border border-white text-xs font-black">
                  {currency === 'USD' ? `$${amount}` : `ZiG ${amount}`}
                </span>
              </button>
              <p className="text-center text-[10px] font-bold text-stone-500 mt-2 uppercase tracking-wider">
                ⚡ Optimistic update: saved to local cache &amp; queued via Outbox
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

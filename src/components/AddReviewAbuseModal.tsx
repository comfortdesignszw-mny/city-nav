import React, { useState } from 'react';
import { 
  X, 
  Star, 
  ThumbsUp, 
  ThumbsDown, 
  ShieldAlert, 
  MessageSquare, 
  DollarSign, 
  Clock, 
  Check, 
  AlertTriangle,
  Sparkles,
  Wifi,
  Wind,
  BatteryCharging,
  Armchair,
  Luggage,
  Coffee,
  Tv,
  Coins
} from 'lucide-react';
import { useOfflineStore } from '../hooks/useOfflineStore';
import { Currency, AbuseCategory, AmenityFeedback } from '../types';

interface AddReviewAbuseModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'route' | 'intercity' | 'operator' | 'transporter' | 'rank';
  targetId: string;
  targetName: string;
  isIntercity?: boolean;
  onSuccess?: () => void;
}

const ABUSE_CATEGORIES: { id: AbuseCategory; label: string; desc: string }[] = [
  { id: 'overcharging', label: 'Overcharging', desc: 'Charging above standard rate or sudden fare spike' },
  { id: 'reckless_driving', label: 'Reckless / Speeding', desc: 'Dangerous overtaking, speeding, or red light violation' },
  { id: 'tout_harassment', label: 'Tout / Hwindi Harassment', desc: 'Aggressive dragging, verbal abuse, or forced boarding' },
  { id: 'overloading', label: 'Severe Overloading', desc: 'Excess passengers standing in aisle or squeezed in boot' },
  { id: 'refusing_currency', label: 'Refusing Legal Currency', desc: 'Refusing change, small notes, Rands, Pula, or ZiG' },
  { id: 'off_route_drop', label: 'Off-Route Abandonment', desc: 'Dropping passengers far from designated terminus' },
  { id: 'breakdown_no_refund', label: 'Breakdown Without Refund', desc: 'Vehicle broke down and operator refused transshipment/refund' },
  { id: 'poor_cleanliness', label: 'Filthy / Poor Hygiene', desc: 'Broken seats, foul smell, or bedbugs on seats' },
];

export const AddReviewAbuseModal: React.FC<AddReviewAbuseModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName,
  isIntercity = false,
  onSuccess,
}) => {
  const store = useOfflineStore();
  const username = store.getUsername();

  // Mode: 'review' | 'abuse' | 'amenities'
  const [activeTab, setActiveTab] = useState<'review' | 'abuse' | 'amenities'>('review');

  // Review states
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState('');
  const [confirmingFare, setConfirmingFare] = useState(false);
  const [fareAmount, setFareAmount] = useState('1.00');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [departureTime, setDepartureTime] = useState('');

  // Amenities states
  const [amenities, setAmenities] = useState<AmenityFeedback>({
    acWorking: true,
    usbCharging: true,
    wifiWorking: false,
    cleanliness: 4,
    punctuality: 4,
    luggageSecurity: true,
  });

  // Abuse states
  const [abuseType, setAbuseType] = useState<AbuseCategory>('overcharging');
  const [abuseLocation, setAbuseLocation] = useState('');
  const [abusePlate, setAbusePlate] = useState('');

  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() && activeTab !== 'abuse') return;

    let confirmedFareData: { amount: number; currency: Currency } | undefined = undefined;
    if (confirmingFare) {
      const parsed = parseFloat(fareAmount);
      if (!isNaN(parsed) && parsed > 0) {
        confirmedFareData = { amount: parsed, currency };
      }
    }

    store.addSocialInteraction({
      targetType,
      targetId,
      targetName,
      comment: comment.trim() || (activeTab === 'abuse' ? `Abuse reported: ${abuseType}` : 'Verified service experience.'),
      rating: activeTab === 'abuse' ? 1 : rating,
      confirmedFare: confirmedFareData,
      confirmedDepartureTime: departureTime.trim() || undefined,
      amenitiesReview: activeTab === 'amenities' || isIntercity ? amenities : undefined,
      isAbuseReport: activeTab === 'abuse',
      abuseType: activeTab === 'abuse' ? abuseType : undefined,
      abuseLocation: abuseLocation.trim() || undefined,
      abusePlateNumber: abusePlate.trim().toUpperCase() || undefined,
    });

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      if (onSuccess) onSuccess();
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-white border-2 border-[#141414] shadow-[8px_8px_0px_0px_#141414] max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-[#141414] text-white border-b-2 border-[#141414] flex items-center justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-[#F27D26] uppercase tracking-widest">Commuter Community</span>
              <span className="text-[10px] text-stone-400 font-bold">• Posting as {username}</span>
            </div>
            <h3 className="text-base font-black text-white uppercase truncate">{targetName}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white text-[#141414] hover:bg-[#F27D26] hover:text-white border-2 border-[#141414] flex items-center justify-center transition font-black cursor-pointer shadow-[2px_2px_0px_0px_#F27D26]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 border-b-2 border-[#141414] bg-[#F5F5F0] flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('review')}
            className={`py-2.5 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border-r border-[#141414] transition cursor-pointer ${
              activeTab === 'review'
                ? 'bg-white text-[#141414] shadow-inner'
                : 'text-stone-600 hover:text-[#141414]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#F27D26]" />
            <span>Review &amp; Fare</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('amenities')}
            className={`py-2.5 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border-r border-[#141414] transition cursor-pointer ${
              activeTab === 'amenities'
                ? 'bg-white text-[#141414] shadow-inner'
                : 'text-stone-600 hover:text-[#141414]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#F27D26]" />
            <span>Amenities</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('abuse')}
            className={`py-2.5 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'abuse'
                ? 'bg-[#EF4444] text-white shadow-inner'
                : 'text-[#EF4444] hover:bg-red-50'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Report Abuse</span>
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center bg-[#F5F5F0] flex-1 flex flex-col items-center justify-center">
            <div className="w-14 h-14 bg-[#141414] text-[#F27D26] border-2 border-[#141414] shadow-[4px_4px_0px_0px_#F27D26] flex items-center justify-center mb-3 animate-bounce">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h4 className="text-xl font-black text-[#141414] uppercase">
              {activeTab === 'abuse' ? 'Abuse Alert Posted!' : 'Feedback & Verification Saved!'}
            </h4>
            <p className="text-xs font-bold text-stone-600 mt-1 max-w-sm">
              Thank you for contributing to safe and fair Zimbabwean transit. Added to community stream and local cache.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            {/* TAB 1: REVIEW & FARE CONFIRMATION */}
            {activeTab === 'review' && (
              <>
                {/* Rating Stars */}
                <div>
                  <label className="block text-xs font-black text-[#141414] uppercase tracking-wider mb-1.5">
                    Your Rating (1 to 5 Stars)
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1 cursor-pointer transition hover:scale-110"
                      >
                        <Star 
                          className={`w-7 h-7 ${
                            star <= rating 
                              ? 'fill-[#F27D26] text-[#141414]' 
                              : 'text-stone-300'
                          }`} 
                        />
                      </button>
                    ))}
                    <span className="text-xs font-black text-[#141414] ml-2">
                      {rating === 5 ? 'Excellent Service' : rating === 4 ? 'Very Good' : rating === 3 ? 'Average' : rating === 2 ? 'Disappointing' : 'Terrible'}
                    </span>
                  </div>
                </div>

                {/* Confirm Fare Toggle */}
                <div className="bg-[#F5F5F0] border-2 border-[#141414] p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-[#F27D26]" />
                      <span className="text-xs font-black text-[#141414] uppercase tracking-wider">
                        Confirm or Approve Fare Paid
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirmingFare(!confirmingFare)}
                      className={`text-[10px] font-black uppercase px-2.5 py-1 border-2 border-[#141414] cursor-pointer transition ${
                        confirmingFare ? 'bg-[#141414] text-[#F27D26]' : 'bg-white text-stone-600'
                      }`}
                    >
                      {confirmingFare ? '✓ Confirming' : '+ Add Fare'}
                    </button>
                  </div>

                  {confirmingFare && (
                    <div className="space-y-3 pt-2 border-t border-stone-300">
                      <div>
                        <label className="block text-[10px] font-black text-stone-600 uppercase mb-1">Currency</label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {(['USD', 'ZWL', 'ZAR', 'BWP'] as Currency[]).map((curr) => (
                            <button
                              key={curr}
                              type="button"
                              onClick={() => {
                                setCurrency(curr);
                                if (curr === 'USD') setFareAmount('1.00');
                                if (curr === 'ZWL') setFareAmount('25');
                                if (curr === 'ZAR') setFareAmount('20');
                                if (curr === 'BWP') setFareAmount('20');
                              }}
                              className={`py-1.5 text-xs font-black uppercase border-2 border-[#141414] transition cursor-pointer ${
                                currency === curr ? 'bg-[#141414] text-white shadow-[2px_2px_0px_0px_#F27D26]' : 'bg-white text-[#141414]'
                              }`}
                            >
                              {curr === 'USD' ? '$ USD' : curr === 'ZWL' ? 'ZiG' : curr === 'ZAR' ? 'R Rand' : 'P Pula'}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-black text-stone-600 uppercase mb-1">Amount Paid</label>
                          <input
                            type="number"
                            step="0.01"
                            value={fareAmount}
                            onChange={(e) => setFareAmount(e.target.value)}
                            className="w-full bg-white border-2 border-[#141414] p-2 text-xs font-black text-[#141414]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-stone-600 uppercase mb-1">Departure / Boarding Time</label>
                          <input
                            type="text"
                            placeholder="e.g. 06:45 AM, Loaded in 10m"
                            value={departureTime}
                            onChange={(e) => setDepartureTime(e.target.value)}
                            className="w-full bg-white border-2 border-[#141414] p-2 text-xs font-bold text-[#141414]"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Comment */}
                <div>
                  <label className="block text-xs font-black text-[#141414] uppercase tracking-wider mb-1">
                    Commuter Review &amp; Comments
                  </label>
                  <textarea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share helpful details: driver conduct, loading speed, route diversions, seat comfort, luggage handling..."
                    required
                    className="w-full bg-white border-2 border-[#141414] p-2.5 text-xs font-bold text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
                  />
                </div>
              </>
            )}

            {/* TAB 2: AMENITIES BREAKDOWN */}
            {activeTab === 'amenities' && (
              <div className="space-y-4">
                <div className="p-3 bg-amber-50 border-2 border-[#141414] text-xs font-bold text-[#141414]">
                  Rate the condition of amenities on this coach/kombi to help fellow passengers make informed travel choices.
                </div>

                <div className="space-y-3">
                  {/* AC Working */}
                  <div className="flex items-center justify-between p-3 bg-[#F5F5F0] border-2 border-[#141414]">
                    <div className="flex items-center gap-2">
                      <Wind className="w-4 h-4 text-[#F27D26]" />
                      <span className="text-xs font-black uppercase text-[#141414]">Air Conditioning (AC)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAmenities(prev => ({ ...prev, acWorking: !prev.acWorking }))}
                      className={`px-3 py-1 text-xs font-black uppercase border-2 border-[#141414] cursor-pointer ${
                        amenities.acWorking ? 'bg-[#10B981] text-white' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {amenities.acWorking ? 'Working' : 'Not Working / None'}
                    </button>
                  </div>

                  {/* USB Charging */}
                  <div className="flex items-center justify-between p-3 bg-[#F5F5F0] border-2 border-[#141414]">
                    <div className="flex items-center gap-2">
                      <BatteryCharging className="w-4 h-4 text-[#F27D26]" />
                      <span className="text-xs font-black uppercase text-[#141414]">USB Phone Charging Ports</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAmenities(prev => ({ ...prev, usbCharging: !prev.usbCharging }))}
                      className={`px-3 py-1 text-xs font-black uppercase border-2 border-[#141414] cursor-pointer ${
                        amenities.usbCharging ? 'bg-[#10B981] text-white' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {amenities.usbCharging ? 'Available' : 'Faulty / None'}
                    </button>
                  </div>

                  {/* Wi-Fi */}
                  <div className="flex items-center justify-between p-3 bg-[#F5F5F0] border-2 border-[#141414]">
                    <div className="flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-[#F27D26]" />
                      <span className="text-xs font-black uppercase text-[#141414]">On-board Wi-Fi</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAmenities(prev => ({ ...prev, wifiWorking: !prev.wifiWorking }))}
                      className={`px-3 py-1 text-xs font-black uppercase border-2 border-[#141414] cursor-pointer ${
                        amenities.wifiWorking ? 'bg-[#10B981] text-white' : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      {amenities.wifiWorking ? 'Active' : 'No Wi-Fi'}
                    </button>
                  </div>

                  {/* Luggage Security */}
                  <div className="flex items-center justify-between p-3 bg-[#F5F5F0] border-2 border-[#141414]">
                    <div className="flex items-center gap-2">
                      <Luggage className="w-4 h-4 text-[#F27D26]" />
                      <span className="text-xs font-black uppercase text-[#141414]">Luggage Compartment Tagging</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAmenities(prev => ({ ...prev, luggageSecurity: !prev.luggageSecurity }))}
                      className={`px-3 py-1 text-xs font-black uppercase border-2 border-[#141414] cursor-pointer ${
                        amenities.luggageSecurity ? 'bg-[#10B981] text-white' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {amenities.luggageSecurity ? 'Safe & Tagged' : 'Careless / Untagged'}
                    </button>
                  </div>

                  {/* Cleanliness Stars */}
                  <div className="p-3 bg-[#F5F5F0] border-2 border-[#141414]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black uppercase text-[#141414]">Interior Cleanliness</span>
                      <span className="text-xs font-black text-[#F27D26]">{amenities.cleanliness || 4} / 5</span>
                    </div>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setAmenities(prev => ({ ...prev, cleanliness: s }))}
                          className="p-1 cursor-pointer"
                        >
                          <Star className={`w-5 h-5 ${(amenities.cleanliness || 4) >= s ? 'fill-[#F27D26] text-[#141414]' : 'text-stone-300'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-[#141414] uppercase tracking-wider mb-1">
                    Amenity Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="e.g. Seats reclined smoothly, AC was very cold, free bottled water provided."
                    className="w-full bg-white border-2 border-[#141414] p-2 text-xs font-bold text-[#141414]"
                  />
                </div>
              </div>
            )}

            {/* TAB 3: REPORT ABUSE */}
            {activeTab === 'abuse' && (
              <div className="space-y-3">
                <div className="p-3 bg-red-100 border-2 border-[#EF4444] text-[#141414] text-xs font-bold flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#EF4444] flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-black text-[#EF4444] uppercase block">Commuter Protection Report</strong>
                    Help warn fellow commuters and hold transporters accountable for safe, legal fares and dignified service.
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-[#141414] uppercase tracking-wider mb-1">
                    Select Abuse Category
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ABUSE_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setAbuseType(cat.id)}
                        className={`p-2.5 text-left border-2 border-[#141414] transition cursor-pointer ${
                          abuseType === cat.id
                            ? 'bg-[#141414] text-white shadow-[3px_3px_0px_0px_#EF4444]'
                            : 'bg-[#F5F5F0] text-[#141414] hover:bg-white'
                        }`}
                      >
                        <div className="font-black text-xs uppercase">{cat.label}</div>
                        <div className="text-[10px] text-stone-400 font-bold leading-tight mt-0.5">{cat.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-black text-[#141414] uppercase mb-1">
                      Vehicle Plate Number (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. AFC 1234"
                      value={abusePlate}
                      onChange={(e) => setAbusePlate(e.target.value)}
                      className="w-full bg-white border-2 border-[#141414] p-2 text-xs font-black text-[#141414]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[#141414] uppercase mb-1">
                      Location / Terminus (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 6th Ave Rank, Tollgate"
                      value={abuseLocation}
                      onChange={(e) => setAbuseLocation(e.target.value)}
                      className="w-full bg-white border-2 border-[#141414] p-2 text-xs font-bold text-[#141414]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-[#141414] uppercase tracking-wider mb-1">
                    Describe What Happened
                  </label>
                  <textarea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Provide specific details: e.g. tout demanded R20 instead of R10, conductor dropped passengers 3km away, driver was drinking/speeding..."
                    required
                    className="w-full bg-white border-2 border-[#141414] p-2.5 text-xs font-bold text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#EF4444]"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className={`w-full py-3 border-2 border-[#141414] uppercase font-black tracking-wider text-xs transition cursor-pointer flex items-center justify-center gap-2 ${
                  activeTab === 'abuse'
                    ? 'bg-[#EF4444] text-white hover:bg-black shadow-[4px_4px_0px_0px_#141414]'
                    : 'bg-[#141414] text-white hover:bg-[#F27D26] shadow-[4px_4px_0px_0px_#F27D26]'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>
                  {activeTab === 'abuse'
                    ? 'Publish Abuse Alert'
                    : 'Submit Commuter Feedback'}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

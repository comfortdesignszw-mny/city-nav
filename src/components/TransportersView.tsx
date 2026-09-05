import React, { useState, useMemo } from 'react';
import { 
  Truck, 
  Car, 
  Bus, 
  Phone, 
  MessageCircle, 
  PlusCircle, 
  Plus,
  Edit3, 
  CheckCircle2, 
  MapPin, 
  Search, 
  ThumbsUp, 
  Clock, 
  ShieldCheck, 
  ArrowRight,
  Filter,
  RefreshCw,
  X,
  Check
} from 'lucide-react';
import { useOfflineStore } from '../hooks/useOfflineStore';
import { TransporterProfile, TransporterVehicleType } from '../types';

const VEHICLE_TYPE_CONFIG: Record<TransporterVehicleType, { label: string; icon: any; color: string }> = {
  hiace_combi: { label: 'HiAce (Combi)', icon: Car, color: 'bg-amber-100 text-amber-900 border-amber-300' },
  mushikashika: { label: 'Mushikashika (Small Taxi)', icon: Car, color: 'bg-orange-100 text-orange-900 border-orange-300' },
  sprinter: { label: 'Sprinter (22 Seater)', icon: Bus, color: 'bg-blue-100 text-blue-900 border-blue-300' },
  sprinter_22: { label: 'Sprinter (22 Seater)', icon: Bus, color: 'bg-blue-100 text-blue-900 border-blue-300' },
  intercity_coach: { label: 'Long Distance Coach', icon: Bus, color: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  long_distance_coach: { label: 'Long Distance Coach', icon: Bus, color: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  cross_border_quantum: { label: 'Cross-Border Quantum', icon: Truck, color: 'bg-purple-100 text-purple-900 border-purple-300' },
  metered_taxi: { label: 'Metered Taxi / Cab', icon: Car, color: 'bg-yellow-100 text-yellow-900 border-yellow-300' },
};

export const TransportersView: React.FC = () => {
  const store = useOfflineStore();
  const transporters = store.getTransporters();
  const cities = store.getCities();
  const routes = store.getRoutes();

  // Filters & Search
  const [selectedCity, setSelectedCity] = useState<string>('All Cities');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isChangeRouteOpen, setIsChangeRouteOpen] = useState(false);
  const [selectedTransporterToEdit, setSelectedTransporterToEdit] = useState<TransporterProfile | null>(null);

  // Filtered List
  const filteredTransporters = useMemo(() => {
    return transporters.filter((t) => {
      // City filter
      if (selectedCity !== 'All Cities' && (t.city || '').toLowerCase() !== selectedCity.toLowerCase()) {
        return false;
      }
      // Type filter
      if (selectedType !== 'all' && t.transportType !== selectedType) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = t.operatorName.toLowerCase().includes(q);
        const matchesRoute = t.currentRouteName.toLowerCase().includes(q);
        const matchesPhone = t.contactPhone.toLowerCase().includes(q);
        const matchesPlate = (t.vehiclePlate || '').toLowerCase().includes(q);
        const matchesTerminus = (t.baseTerminus || '').toLowerCase().includes(q);
        if (!matchesName && !matchesRoute && !matchesPhone && !matchesPlate && !matchesTerminus) {
          return false;
        }
      }
      return true;
    });
  }, [transporters, selectedCity, selectedType, searchQuery]);

  // Open Route Change Modal for a transporter
  const handleOpenEditRoute = (t: TransporterProfile) => {
    setSelectedTransporterToEdit(t);
    setIsChangeRouteOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* View Header & Registration Action */}
      <div className="bg-white border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-[#F27D26] text-white px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
                Service Providers
              </span>
              <span className="text-xs text-stone-500 font-bold">
                {transporters.length} Registered Transporters
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#141414] uppercase tracking-tight">
              Transporters &amp; Vehicle Fleets
            </h2>
            <p className="text-xs font-bold text-stone-600 mt-1 max-w-xl">
              Directory for HiAce Combis, Mushikashika, Sprinters (22-seaters), Coaches, and Cross-Border Quantums. Transporters can register and update routes anytime.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsRegisterOpen(true)}
              className="py-2.5 px-4 bg-[#141414] text-white border-2 border-[#141414] shadow-[3px_3px_0px_0px_#F27D26] hover:bg-[#F27D26] hover:text-white transition font-black text-xs uppercase tracking-wider cursor-pointer flex items-center gap-2 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Register As Transporter</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="mt-4 pt-4 border-t-2 border-stone-200 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search driver, route, phone, plate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F5F5F0] border-2 border-[#141414] pl-9 pr-3 py-2 text-xs font-bold text-[#141414] focus:outline-none focus:bg-white"
            />
          </div>

          {/* City Filter */}
          <div>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full bg-[#F5F5F0] border-2 border-[#141414] px-3 py-2 text-xs font-black text-[#141414] uppercase tracking-wider focus:outline-none cursor-pointer"
            >
              <option value="All Cities">All Cities &amp; Corridors</option>
              {cities.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
              <option value="Plumtree">Plumtree (Border Corridor)</option>
              <option value="Beitbridge">Beitbridge (Cross-Border)</option>
            </select>
          </div>

          {/* Vehicle Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-[#F5F5F0] border-2 border-[#141414] px-3 py-2 text-xs font-black text-[#141414] uppercase tracking-wider focus:outline-none cursor-pointer"
            >
              <option value="all">All Vehicle Types</option>
              <option value="hiace_combi">HiAce (Combi 15-seater)</option>
              <option value="mushikashika">Mushikashika (Small Taxi / Sienta)</option>
              <option value="sprinter">Sprinters (22 Seaters)</option>
              <option value="long_distance_coach">Long Distance Coaches</option>
              <option value="cross_border_quantum">Cross-Border Quantum</option>
              <option value="metered_taxi">Metered Taxis</option>
            </select>
          </div>
        </div>

        {/* Quick Vehicle Type Pills */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-2.5 py-1 text-[11px] font-black uppercase tracking-wider whitespace-nowrap border border-[#141414] transition cursor-pointer ${
              selectedType === 'all' ? 'bg-[#141414] text-white' : 'bg-white text-stone-700 hover:bg-stone-100'
            }`}
          >
            All Fleets ({transporters.length})
          </button>
          {Object.entries(VEHICLE_TYPE_CONFIG).map(([typeKey, cfg]) => {
            const count = transporters.filter((t) => t.transportType === typeKey).length;
            return (
              <button
                key={typeKey}
                onClick={() => setSelectedType(typeKey)}
                className={`px-2.5 py-1 text-[11px] font-black uppercase tracking-wider whitespace-nowrap border border-[#141414] transition cursor-pointer flex items-center gap-1 ${
                  selectedType === typeKey
                    ? 'bg-[#F27D26] text-white shadow-[1px_1px_0px_0px_#141414]'
                    : 'bg-white text-stone-700 hover:bg-stone-100'
                }`}
              >
                <span>{cfg.label}</span>
                <span className="text-[9px] opacity-75 font-bold">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Transporters List */}
      <div className="space-y-3">
        {filteredTransporters.length === 0 ? (
          <div className="p-8 sm:p-10 text-center bg-white border-2 border-[#141414] shadow-[6px_6px_0px_0px_#141414] space-y-4">
            <div className="w-16 h-16 bg-[#F5F5F0] border-2 border-[#141414] shadow-[3px_3px_0px_0px_#F27D26] flex items-center justify-center mx-auto text-[#141414]">
              <Truck className="w-8 h-8 text-[#F27D26]" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#F27D26] block">
                Official Directory Ready
              </span>
              <h3 className="text-lg sm:text-xl font-black text-[#141414] uppercase tracking-tight">
                {transporters.length === 0 ? 'No Transporters Registered Yet' : 'No Transporters Match Filters'}
              </h3>
              <p className="text-xs sm:text-sm font-medium text-stone-600 leading-relaxed">
                {transporters.length === 0
                  ? 'Nothing is created yet! The transport directory is clean and open for production. Are you a kombi driver, conductor, fleet owner, or cross-border transporter? Register your vehicle to connect with commuters directly on WhatsApp and phone.'
                  : 'No registered transport providers match your search, city, or vehicle type filter. Reset your filters to see all available listings.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setIsRegisterOpen(true)}
                className="py-3 px-6 bg-[#141414] hover:bg-[#F27D26] text-white font-black text-xs sm:text-sm uppercase tracking-wider border-2 border-[#141414] shadow-[4px_4px_0px_0px_#F27D26] transition cursor-pointer flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>+ Register Your Vehicle / Fleet</span>
              </button>
              {transporters.length > 0 && (
                <button
                  onClick={() => { setSelectedCity('All Cities'); setSelectedType('all'); setSearchQuery(''); }}
                  className="py-3 px-4 bg-[#F5F5F0] hover:bg-stone-200 text-[#141414] font-black text-xs sm:text-sm uppercase tracking-wider border-2 border-[#141414] transition cursor-pointer"
                >
                  Reset Filters ({transporters.length})
                </button>
              )}
            </div>
          </div>
        ) : (
          filteredTransporters.map((t) => {
            const vehicleMeta = VEHICLE_TYPE_CONFIG[t.transportType] || VEHICLE_TYPE_CONFIG.hiace_combi;
            const VehicleIcon = vehicleMeta.icon;
            const whatsappNumber = t.contactPhone.replace(/[^0-9]/g, '');

            return (
              <div 
                key={t.id}
                className="bg-white border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414] p-4 transition hover:translate-y-[-1px]"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  {/* Left Column: Operator details & route */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-black text-[#141414] uppercase tracking-tight">
                        {t.operatorName}
                      </h3>
                      <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border ${vehicleMeta.color}`}>
                        {t.transportTypeLabel}
                      </span>
                      <span className="bg-[#141414] text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
                        {t.city}
                      </span>
                      {t.status === 'active' && (
                        <span className="bg-emerald-500 text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          Active on Route
                        </span>
                      )}
                    </div>

                    {/* Route Always Served */}
                    <div className="p-2.5 bg-[#F5F5F0] border border-[#141414] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin className="w-4 h-4 text-[#F27D26] flex-shrink-0" />
                        <div>
                          <div className="text-[10px] font-black text-stone-500 uppercase tracking-wider">
                            Route Always Served
                          </div>
                          <div className="text-sm font-black text-[#141414] truncate">
                            {t.currentRouteName}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenEditRoute(t)}
                        className="px-2.5 py-1 bg-white hover:bg-[#141414] hover:text-white text-[#141414] border border-[#141414] text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition cursor-pointer shadow-[1px_1px_0px_0px_#141414]"
                      >
                        <Edit3 className="w-3 h-3 text-[#F27D26]" />
                        <span>Change Route</span>
                      </button>
                    </div>

                    {/* Notes, Terminus, & Plates */}
                    <div className="flex items-center gap-3 text-xs text-stone-600 font-bold flex-wrap">
                      {t.baseTerminus && (
                        <span className="flex items-center gap-1">
                          <strong>Base:</strong> {t.baseTerminus}
                        </span>
                      )}
                      {t.vehiclePlate && (
                        <span className="bg-stone-100 border border-stone-300 px-1.5 py-0.5 text-[10px] font-black text-[#141414] uppercase">
                          Plate: {t.vehiclePlate}
                        </span>
                      )}
                      {t.statusNote && (
                        <span className="text-stone-700 italic">
                          "{t.statusNote}"
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Contact & Action Buttons */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-200">
                    <div className="flex items-center gap-1.5">
                      {/* Call Phone Button */}
                      <a
                        href={`tel:${t.contactPhone}`}
                        className="py-2 px-3 bg-[#141414] text-white border-2 border-[#141414] shadow-[2px_2px_0px_0px_#F27D26] hover:bg-[#F27D26] hover:text-white transition font-black text-xs uppercase flex items-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5 text-[#F27D26]" />
                        <span>Call</span>
                      </a>

                      {/* WhatsApp Button */}
                      <a
                        href={`https://wa.me/${whatsappNumber}?text=Hello%20${encodeURIComponent(t.operatorName)},%20I%20saw%20your%20transport%20service%20for%20${encodeURIComponent(t.currentRouteName)}%20on%20Fambai.`}
                        target="_blank"
                        rel="noreferrer"
                        className="py-2 px-3 bg-[#10B981] text-white border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414] hover:bg-emerald-600 transition font-black text-xs uppercase flex items-center gap-1.5"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>

                      {/* Like / Thumbs-up */}
                      <button
                        onClick={() => store.toggleLikeTransporter(t.id)}
                        className={`p-2 border-2 border-[#141414] transition cursor-pointer flex items-center gap-1 text-xs font-black ${
                          t.userLiked
                            ? 'bg-[#F27D26] text-white shadow-[2px_2px_0px_0px_#141414]'
                            : 'bg-white text-stone-700 hover:bg-stone-100'
                        }`}
                        title="Appreciate this transporter"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>{t.likes}</span>
                      </button>
                    </div>

                    <div className="text-[10px] text-stone-400 font-bold">
                      Phone: <span className="text-[#141414] font-black">{t.contactPhone}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* REGISTRATION MODAL */}
      {isRegisterOpen && (
        <RegisterTransporterModal 
          isOpen={isRegisterOpen} 
          onClose={() => setIsRegisterOpen(false)} 
        />
      )}

      {/* CHANGE ROUTE MODAL */}
      {isChangeRouteOpen && selectedTransporterToEdit && (
        <ChangeTransporterRouteModal
          isOpen={isChangeRouteOpen}
          transporter={selectedTransporterToEdit}
          onClose={() => {
            setIsChangeRouteOpen(false);
            setSelectedTransporterToEdit(null);
          }}
        />
      )}
    </div>
  );
};

// ==========================================
// REGISTER TRANSPORTER MODAL COMPONENT
// ==========================================
interface RegisterTransporterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RegisterTransporterModal: React.FC<RegisterTransporterModalProps> = ({
  isOpen,
  onClose,
}) => {
  const store = useOfflineStore();
  const cities = store.getCities();
  const routes = store.getRoutes();

  const [operatorName, setOperatorName] = useState('');
  const [contactPhone, setContactPhone] = useState('+263 ');
  const [transportType, setTransportType] = useState<TransporterVehicleType>('hiace_combi');
  const [city, setCity] = useState('Harare');
  const [currentRouteName, setCurrentRouteName] = useState('');
  const [baseTerminus, setBaseTerminus] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorName.trim() || !contactPhone.trim() || !currentRouteName.trim()) return;

    const labelMap: Record<TransporterVehicleType, string> = {
      hiace_combi: 'HiAce (Combi)',
      mushikashika: 'Mushikashika (Small Taxi)',
      sprinter: 'Sprinter (22 Seater)',
      sprinter_22: 'Sprinter (22 Seater)',
      intercity_coach: 'Long Distance Coach',
      long_distance_coach: 'Long Distance Coach',
      cross_border_quantum: 'Cross-Border Quantum',
      metered_taxi: 'Metered Taxi / Cab',
    };

    store.registerTransporter({
      operatorName: operatorName.trim(),
      contactPhone: contactPhone.trim(),
      transportType,
      transportTypeLabel: labelMap[transportType] || 'Transport Provider',
      currentRouteName: currentRouteName.trim(),
      city,
      baseTerminus: baseTerminus.trim() || undefined,
      vehiclePlate: vehiclePlate.trim().toUpperCase() || undefined,
      statusNote: statusNote.trim() || undefined,
    });

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-white border-2 border-[#141414] shadow-[8px_8px_0px_0px_#141414] max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 bg-[#141414] text-white border-b-2 border-[#141414] flex items-center justify-between flex-shrink-0">
          <div>
            <span className="text-[10px] font-black text-[#F27D26] uppercase tracking-widest">
              Fleet &amp; Service Provider Registration
            </span>
            <h3 className="text-base font-black text-white uppercase">
              Register As Transporter
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white text-[#141414] hover:bg-[#F27D26] hover:text-white border-2 border-[#141414] flex items-center justify-center font-black cursor-pointer shadow-[2px_2px_0px_0px_#F27D26]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center bg-[#F5F5F0] flex-1 flex flex-col items-center justify-center">
            <div className="w-14 h-14 bg-[#141414] text-[#F27D26] border-2 border-[#141414] shadow-[4px_4px_0px_0px_#F27D26] flex items-center justify-center mb-3 animate-bounce">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h4 className="text-xl font-black text-[#141414] uppercase">Transporter Registered!</h4>
            <p className="text-xs font-bold text-stone-600 mt-1 max-w-sm">
              Your service is now visible to commuters on the route and in the transport directory. You can update your route anytime.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1">
            {/* Operator Name */}
            <div>
              <label className="block text-xs font-black text-[#141414] uppercase tracking-wider mb-1">
                Driver / Operator / Fleet Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Baba Tawanda Kombis, Sibanda Sprinters, Plumtree Cross-Border Quantum"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                required
                className="w-full bg-white border-2 border-[#141414] p-2.5 text-xs font-black text-[#141414]"
              />
            </div>

            {/* Transport Type */}
            <div>
              <label className="block text-xs font-black text-[#141414] uppercase tracking-wider mb-1">
                Type of Transport *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(VEHICLE_TYPE_CONFIG) as [TransporterVehicleType, any][]).map(([val, cfg]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setTransportType(val)}
                    className={`p-2 text-left border-2 border-[#141414] transition cursor-pointer text-xs font-black uppercase ${
                      transportType === val
                        ? 'bg-[#141414] text-white shadow-[2px_2px_0px_0px_#F27D26]'
                        : 'bg-[#F5F5F0] text-[#141414] hover:bg-white'
                    }`}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Phone Number & City */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-[#141414] uppercase tracking-wider mb-1">
                  Phone / WhatsApp Number *
                </label>
                <input
                  type="tel"
                  placeholder="+263 77 123 4567"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  required
                  className="w-full bg-white border-2 border-[#141414] p-2 text-xs font-black text-[#141414]"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#141414] uppercase tracking-wider mb-1">
                  Operating City / Region *
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-white border-2 border-[#141414] p-2 text-xs font-black text-[#141414] uppercase"
                >
                  {cities.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                  <option value="Plumtree">Plumtree (Border)</option>
                  <option value="Beitbridge">Beitbridge (Cross-Border)</option>
                </select>
              </div>
            </div>

            {/* Route Always Served */}
            <div>
              <label className="block text-xs font-black text-[#141414] uppercase tracking-wider mb-1">
                Route Always Served *
              </label>
              <input
                type="text"
                placeholder="e.g. City Centre ↔ Chitungwiza (Makoni), Bulawayo ↔ Plumtree Border, Cowdray Park ↔ 6th Ave"
                value={currentRouteName}
                onChange={(e) => setCurrentRouteName(e.target.value)}
                required
                className="w-full bg-white border-2 border-[#141414] p-2.5 text-xs font-black text-[#141414]"
              />
              <p className="text-[10px] text-stone-500 font-bold mt-1">
                You can easily change or switch this route at any time whenever you change your daily corridor.
              </p>
            </div>

            {/* Terminus & Vehicle Plate */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-[#141414] uppercase tracking-wider mb-1">
                  Base Terminus / Loading Rank
                </label>
                <input
                  type="text"
                  placeholder="e.g. Copacabana, 6th Ave Rank, Renkini"
                  value={baseTerminus}
                  onChange={(e) => setBaseTerminus(e.target.value)}
                  className="w-full bg-white border-2 border-[#141414] p-2 text-xs font-bold text-[#141414]"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#141414] uppercase tracking-wider mb-1">
                  Vehicle Plate Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. AFC 4521"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                  className="w-full bg-white border-2 border-[#141414] p-2 text-xs font-black text-[#141414]"
                />
              </div>
            </div>

            {/* Status Note */}
            <div>
              <label className="block text-xs font-black text-[#141414] uppercase tracking-wider mb-1">
                Status Note / Accepted Currencies
              </label>
              <input
                type="text"
                placeholder="e.g. Accepts Rands (R10) or USD $0.50, departs every 15 mins"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                className="w-full bg-white border-2 border-[#141414] p-2 text-xs font-bold text-[#141414]"
              />
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 bg-[#141414] text-white border-2 border-[#141414] shadow-[4px_4px_0px_0px_#F27D26] uppercase font-black tracking-wider text-xs hover:bg-[#F27D26] transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Publish Transporter Profile</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// ==========================================
// CHANGE ROUTE MODAL COMPONENT (ROUTE SWITCHER)
// ==========================================
interface ChangeTransporterRouteModalProps {
  isOpen: boolean;
  transporter: TransporterProfile;
  onClose: () => void;
}

const ChangeTransporterRouteModal: React.FC<ChangeTransporterRouteModalProps> = ({
  isOpen,
  transporter,
  onClose,
}) => {
  const store = useOfflineStore();
  const cities = store.getCities();

  const [newRouteName, setNewRouteName] = useState(transporter.currentRouteName);
  const [newCity, setNewCity] = useState(transporter.city);
  const [newTerminus, setNewTerminus] = useState(transporter.baseTerminus || '');
  const [status, setStatus] = useState<TransporterProfile['status']>(transporter.status);
  const [statusNote, setStatusNote] = useState(transporter.statusNote || '');
  const [phone, setPhone] = useState(transporter.contactPhone);
  const [updatedSuccess, setUpdatedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRouteName.trim()) return;

    store.updateTransporterRoute(transporter.id, {
      currentRouteName: newRouteName.trim(),
      city: newCity,
      baseTerminus: newTerminus.trim() || undefined,
      status,
      statusNote: statusNote.trim() || undefined,
      contactPhone: phone.trim(),
    });

    setUpdatedSuccess(true);
    setTimeout(() => {
      setUpdatedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-white border-2 border-[#141414] shadow-[8px_8px_0px_0px_#141414] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 bg-[#141414] text-white border-b-2 border-[#141414] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-[#F27D26] uppercase tracking-widest">
              Route Switcher
            </span>
            <h3 className="text-base font-black text-white uppercase truncate">
              Change Route for {transporter.operatorName}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white text-[#141414] hover:bg-[#F27D26] hover:text-white border-2 border-[#141414] flex items-center justify-center font-black cursor-pointer shadow-[2px_2px_0px_0px_#F27D26]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {updatedSuccess ? (
          <div className="p-8 text-center bg-[#F5F5F0]">
            <div className="w-14 h-14 bg-[#141414] text-[#F27D26] border-2 border-[#141414] shadow-[4px_4px_0px_0px_#F27D26] flex items-center justify-center mx-auto mb-3 animate-bounce">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h4 className="text-xl font-black text-[#141414] uppercase">Route Updated!</h4>
            <p className="text-xs font-bold text-stone-600 mt-1">
              Your new route is now live for passengers and searches.
            </p>
          </div>
        ) : (
          <form onSubmit={handleUpdate} className="p-4 sm:p-5 space-y-3.5">
            <div>
              <label className="block text-xs font-black text-[#141414] uppercase tracking-wider mb-1">
                New Route Serving Right Now *
              </label>
              <input
                type="text"
                value={newRouteName}
                onChange={(e) => setNewRouteName(e.target.value)}
                required
                className="w-full bg-white border-2 border-[#141414] p-2.5 text-xs font-black text-[#141414]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-[#141414] uppercase tracking-wider mb-1">
                  City
                </label>
                <select
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  className="w-full bg-white border-2 border-[#141414] p-2 text-xs font-black text-[#141414] uppercase"
                >
                  {cities.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                  <option value="Plumtree">Plumtree (Border)</option>
                  <option value="Beitbridge">Beitbridge (Cross-Border)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-[#141414] uppercase tracking-wider mb-1">
                  Operating Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-white border-2 border-[#141414] p-2 text-xs font-black text-[#141414] uppercase"
                >
                  <option value="active">Active on Route</option>
                  <option value="loading">Loading at Terminus</option>
                  <option value="resting">Resting / Off-Duty</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-[#141414] uppercase tracking-wider mb-1">
                Loading Terminus / Rank
              </label>
              <input
                type="text"
                value={newTerminus}
                onChange={(e) => setNewTerminus(e.target.value)}
                placeholder="e.g. 6th Ave Rank, Copacabana"
                className="w-full bg-white border-2 border-[#141414] p-2 text-xs font-bold text-[#141414]"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-[#141414] uppercase tracking-wider mb-1">
                Status Note / Schedule
              </label>
              <input
                type="text"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="e.g. Loading now, accepting Rands, leaving in 10 mins"
                className="w-full bg-white border-2 border-[#141414] p-2 text-xs font-bold text-[#141414]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 bg-[#141414] text-white border-2 border-[#141414] shadow-[4px_4px_0px_0px_#F27D26] uppercase font-black tracking-wider text-xs hover:bg-[#F27D26] transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Save Route Switch</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

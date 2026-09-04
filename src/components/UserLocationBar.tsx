import React, { useState } from 'react';
import { 
  MapPin, 
  Navigation, 
  Compass, 
  Check, 
  Search, 
  Building2, 
  X,
  Crosshair,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { useOfflineStore } from '../hooks/useOfflineStore';
import { UserLocation } from '../types';
import { 
  ZIMBABWE_LOCATION_PRESETS, 
  LocationPreset, 
  formatCoordinates,
  findClosestPreset 
} from '../utils/geoUtils';

interface UserLocationBarProps {
  onLocationChange?: (location: UserLocation) => void;
}

export const UserLocationBar: React.FC<UserLocationBarProps> = ({ onLocationChange }) => {
  const store = useOfflineStore();
  const currentLocation = store.getUserLocation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'acquiring' | 'success' | 'error'>('idle');
  const [gpsMessage, setGpsMessage] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('All');
  
  // Custom manual coordinates input mode
  const [showCustomCoords, setShowCustomCoords] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customLat, setCustomLat] = useState(currentLocation.lat.toString());
  const [customLng, setCustomLng] = useState(currentLocation.lng.toString());

  // Handle GPS Auto-Detection (Optimized for low network / low-end phone GPS)
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      setGpsMessage('Geolocation is not supported by your browser.');
      return;
    }

    setGpsStatus('acquiring');
    setGpsMessage('Acquiring device GPS satellites...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        // Check if close to a known Zimbabwean preset landmark
        const closestPreset = findClosestPreset(latitude, longitude);
        const name = closestPreset 
          ? `Near ${closestPreset.name}`
          : `GPS Location (${formatCoordinates(latitude, longitude)})`;

        const newLoc: UserLocation = {
          lat: latitude,
          lng: longitude,
          name,
          source: 'gps',
          accuracyMeters: Math.round(accuracy),
          timestamp: Date.now(),
        };

        store.setUserLocation(newLoc);
        onLocationChange?.(newLoc);

        setGpsStatus('success');
        setGpsMessage(`GPS Locked: ±${Math.round(accuracy)}m accuracy`);
        setTimeout(() => {
          setGpsStatus('idle');
          setGpsMessage('');
          setIsModalOpen(false);
        }, 1200);
      },
      (err) => {
        setGpsStatus('error');
        if (err.code === err.PERMISSION_DENIED) {
          setGpsMessage('GPS permission was denied. Select a neighborhood preset below.');
        } else if (err.code === err.TIMEOUT) {
          setGpsMessage('GPS satellite request timed out. Select a neighborhood preset below.');
        } else {
          setGpsMessage('Unable to acquire GPS signal. Select a preset below.');
        }
      },
      {
        // Low power & fast acquisition suitable for 2G / low-spec phones
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const handleSelectPreset = (preset: LocationPreset) => {
    const newLoc: UserLocation = {
      lat: preset.lat,
      lng: preset.lng,
      name: `${preset.name}`,
      source: 'preset',
      accuracyMeters: 25,
      timestamp: Date.now(),
    };

    store.setUserLocation(newLoc);
    onLocationChange?.(newLoc);
    setIsModalOpen(false);
  };

  const handleSaveCustomCoords = (e: React.FormEvent) => {
    e.preventDefault();
    const latNum = parseFloat(customLat);
    const lngNum = parseFloat(customLng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      alert('Please enter valid decimal coordinates (e.g. -17.8315, 31.0450)');
      return;
    }

    const newLoc: UserLocation = {
      lat: latNum,
      lng: lngNum,
      name: customName.trim() || `Custom Spot (${formatCoordinates(latNum, lngNum)})`,
      source: 'manual',
      accuracyMeters: 10,
      timestamp: Date.now(),
    };

    store.setUserLocation(newLoc);
    onLocationChange?.(newLoc);
    setIsModalOpen(false);
  };

  // Filter presets
  const filteredPresets = ZIMBABWE_LOCATION_PRESETS.filter((p) => {
    const matchesCity = selectedCityFilter === 'All' || p.city.toLowerCase() === selectedCityFilter.toLowerCase();
    const q = searchFilter.toLowerCase().trim();
    const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.city.toLowerCase().includes(q);
    return matchesCity && matchesSearch;
  });

  const uniqueCities = ['All', ...Array.from(new Set(ZIMBABWE_LOCATION_PRESETS.map((p) => p.city)))];

  return (
    <>
      {/* Compact Location Bar */}
      <div className="bg-white border-2 border-[#141414] p-3 sm:p-3.5 shadow-[4px_4px_0px_0px_#141414] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 bg-[#141414] text-[#F27D26] border-2 border-[#141414] flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0px_0px_#F27D26]">
            <Compass className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#F27D26]">
                Your Location Anchor:
              </span>
              <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-[#F5F5F0] border border-[#141414] text-[#141414]">
                {currentLocation.source === 'gps' ? 'Device GPS' : 'Set by Passenger'}
              </span>
            </div>
            <div className="text-sm font-black text-[#141414] truncate flex items-center gap-1.5">
              <span className="truncate">{currentLocation.name}</span>
              <span className="text-[10px] font-bold text-stone-500 flex-shrink-0 hidden md:inline">
                ({formatCoordinates(currentLocation.lat, currentLocation.lng)})
              </span>
            </div>
          </div>
        </div>

        {/* Location Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-shrink-0">
          <button
            id="detect-gps-btn"
            onClick={handleDetectGPS}
            disabled={gpsStatus === 'acquiring'}
            className="flex-1 sm:flex-initial px-3 py-1.5 bg-[#F5F5F0] hover:bg-[#141414] hover:text-white text-[#141414] text-xs font-black uppercase tracking-wider border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414] transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Auto-detect current GPS location"
          >
            <Crosshair className={`w-3.5 h-3.5 ${gpsStatus === 'acquiring' ? 'animate-spin text-[#F27D26]' : 'text-[#F27D26]'}`} />
            <span>{gpsStatus === 'acquiring' ? 'Acquiring...' : 'Detect GPS'}</span>
          </button>

          <button
            id="change-location-btn"
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-initial px-3 py-1.5 bg-[#141414] text-white hover:bg-[#F27D26] text-xs font-black uppercase tracking-wider border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414] transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-[#F27D26]" />
            <span>Set Location</span>
          </button>
        </div>
      </div>

      {/* GPS Status Toast if active */}
      {gpsMessage && (
        <div className={`p-2.5 text-xs font-black uppercase tracking-wider border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414] flex items-center gap-2 ${
          gpsStatus === 'error' ? 'bg-rose-100 text-rose-900' : 'bg-amber-100 text-amber-950'
        }`}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{gpsMessage}</span>
        </div>
      )}

      {/* Location Picker Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border-4 border-[#141414] shadow-[8px_8px_0px_0px_#F27D26] max-w-lg w-full p-4 sm:p-6 space-y-4 text-[#141414] my-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b-2 border-[#141414] pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#F27D26]">
                  Passenger Navigation Anchor
                </span>
                <h3 className="text-xl font-black uppercase tracking-tight text-[#141414] flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#F27D26]" />
                  Set Your Current Location
                </h3>
                <p className="text-xs font-medium text-stone-600 mt-0.5">
                  Distances to kombi ranks, taxi stands, and fares will be calculated relative to this point.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-500 hover:text-[#141414] text-sm font-black p-1 border border-stone-300 hover:border-[#141414] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* GPS Auto-Detect Button inside modal */}
            <div className="p-3 bg-[#F5F5F0] border-2 border-[#141414] shadow-[3px_3px_0px_0px_#141414] flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-black uppercase text-[#141414] flex items-center gap-1.5">
                  <Crosshair className="w-4 h-4 text-[#F27D26]" />
                  <span>Use Device Geolocation (GPS)</span>
                </div>
                <p className="text-[11px] font-medium text-stone-600">
                  Lightweight sensor lock. Works with low network &amp; offline satellite caching.
                </p>
              </div>
              <button
                onClick={handleDetectGPS}
                disabled={gpsStatus === 'acquiring'}
                className="px-3 py-2 bg-[#141414] hover:bg-[#F27D26] text-white text-xs font-black uppercase tracking-wider border-2 border-[#141414] transition cursor-pointer flex-shrink-0"
              >
                {gpsStatus === 'acquiring' ? 'Locking...' : 'Detect'}
              </button>
            </div>

            {/* Toggle Between Presets and Custom Coordinates */}
            <div className="flex border-2 border-[#141414] p-1 bg-[#F5F5F0]">
              <button
                type="button"
                onClick={() => setShowCustomCoords(false)}
                className={`flex-1 py-1.5 text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                  !showCustomCoords ? 'bg-[#141414] text-white shadow-[2px_2px_0px_0px_#F27D26]' : 'text-[#141414]'
                }`}
              >
                Zimbabwe Neighborhood Presets
              </button>
              <button
                type="button"
                onClick={() => setShowCustomCoords(true)}
                className={`flex-1 py-1.5 text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                  showCustomCoords ? 'bg-[#141414] text-white shadow-[2px_2px_0px_0px_#F27D26]' : 'text-[#141414]'
                }`}
              >
                Custom Coordinates / Spot
              </button>
            </div>

            {!showCustomCoords ? (
              <div className="space-y-3">
                {/* Search & City Filter Bar */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Search suburb, rank, or shopping center (e.g. Makoni, Sam Levy, Egodini)..."
                      className="w-full pl-9 pr-3 py-2 text-xs font-bold border-2 border-[#141414] bg-[#F5F5F0] focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {uniqueCities.map((city) => (
                      <button
                        key={city}
                        onClick={() => setSelectedCityFilter(city)}
                        className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border border-[#141414] transition cursor-pointer flex-shrink-0 ${
                          selectedCityFilter === city
                            ? 'bg-[#141414] text-white shadow-[2px_2px_0px_0px_#F27D26]'
                            : 'bg-white text-[#141414] hover:bg-[#F5F5F0]'
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Presets List */}
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                  {filteredPresets.length === 0 ? (
                    <div className="p-4 text-center text-xs font-bold text-stone-500 bg-[#F5F5F0] border border-stone-300">
                      No landmarks found matching "{searchFilter}".
                    </div>
                  ) : (
                    filteredPresets.map((preset) => {
                      const isSelected = 
                        Math.abs(currentLocation.lat - preset.lat) < 0.001 &&
                        Math.abs(currentLocation.lng - preset.lng) < 0.001;

                      return (
                        <div
                          key={preset.id}
                          onClick={() => handleSelectPreset(preset)}
                          className={`p-2.5 border-2 border-[#141414] transition cursor-pointer flex items-center justify-between gap-2 ${
                            isSelected
                              ? 'bg-[#F27D26] text-white shadow-[3px_3px_0px_0px_#141414]'
                              : 'bg-white hover:bg-[#F5F5F0] shadow-[2px_2px_0px_0px_#141414]'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 border border-[#141414] ${
                                isSelected ? 'bg-white text-[#141414]' : 'bg-[#141414] text-white'
                              }`}>
                                {preset.city}
                              </span>
                              <h4 className="text-xs font-black uppercase truncate">
                                {preset.name}
                              </h4>
                            </div>
                            <p className={`text-[11px] font-medium truncate mt-0.5 ${
                              isSelected ? 'text-white/90' : 'text-stone-600'
                            }`}>
                              {preset.description}
                            </p>
                          </div>

                          <button
                            type="button"
                            className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border-2 border-[#141414] flex-shrink-0 ${
                              isSelected
                                ? 'bg-white text-[#141414]'
                                : 'bg-[#141414] text-white'
                            }`}
                          >
                            {isSelected ? 'Active' : 'Choose'}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              /* Custom Coordinates Form */
              <form onSubmit={handleSaveCustomCoords} className="space-y-3 bg-[#F5F5F0] p-3.5 border-2 border-[#141414]">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#141414] mb-1">
                    Location Name / Pickup Spot
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. My Street Corner, Avondale Shops Gate 2..."
                    className="w-full p-2 text-xs font-bold border-2 border-[#141414] bg-white focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-[#141414] mb-1">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={customLat}
                      onChange={(e) => setCustomLat(e.target.value)}
                      placeholder="-17.8315"
                      className="w-full p-2 text-xs font-bold border-2 border-[#141414] bg-white focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-[#141414] mb-1">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={customLng}
                      onChange={(e) => setCustomLng(e.target.value)}
                      placeholder="31.0450"
                      className="w-full p-2 text-xs font-bold border-2 border-[#141414] bg-white focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <p className="text-[10px] text-stone-500 font-medium italic">
                  Tip: Negative latitude is South (Zimbabwe is ~ -17° to -22°S, 25° to 33°E).
                </p>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#141414] hover:bg-[#F27D26] text-white text-xs font-black uppercase tracking-wider border-2 border-[#141414] shadow-[3px_3px_0px_0px_#F27D26] transition cursor-pointer"
                >
                  Save Custom Location
                </button>
              </form>
            )}

            {/* Modal Footer */}
            <div className="border-t-2 border-[#141414] pt-3 flex items-center justify-between">
              <span className="text-[10px] text-stone-500 font-black uppercase">
                Works 100% Offline
              </span>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-1.5 bg-[#141414] text-white text-xs font-black uppercase tracking-wider border-2 border-[#141414] hover:bg-stone-800 transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

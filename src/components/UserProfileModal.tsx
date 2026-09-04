import React, { useState } from 'react';
import { 
  X, 
  User, 
  AtSign, 
  Check, 
  ShieldCheck, 
  Sparkles, 
  Award,
  Phone,
  Truck
} from 'lucide-react';
import { useOfflineStore } from '../hooks/useOfflineStore';
import { UserProfile } from '../types';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BADGE_OPTIONS = [
  'Daily Commuter',
  'Route Scout',
  'Verified Passenger',
  'Bulawayo Commuter',
  'Harare Commuter',
  'Cross-Border Traveller',
  'Kombi Connoisseur',
  'Registered Transporter',
];

const AVATAR_COLORS = [
  '#F27D26', // Orange Brand
  '#141414', // Jet Black
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#EF4444', // Red
  '#06B6D4', // Cyan
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
}) => {
  const store = useOfflineStore();
  const profile = store.getUserProfile();

  const [username, setUsername] = useState(profile.username || '');
  const [handle, setHandle] = useState(profile.handle || '');
  const [avatarColor, setAvatarColor] = useState(profile.avatarColor || '#F27D26');
  const [badge, setBadge] = useState(profile.commuterBadge || 'Daily Commuter');
  const [phone, setPhone] = useState(profile.phone || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleUsernameChange = (val: string) => {
    setUsername(val);
    const cleanHandle = '@' + val.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    setHandle(cleanHandle);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    store.updateUserProfile({
      username: username.trim(),
      handle: handle.startsWith('@') ? handle : `@${handle}`,
      avatarColor,
      commuterBadge: badge,
      phone: phone.trim() || undefined,
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-white border-2 border-[#141414] shadow-[8px_8px_0px_0px_#141414] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-[#141414] text-white border-b-2 border-[#141414] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div 
              className="w-8 h-8 flex items-center justify-center font-black text-white border-2 border-white shadow-[2px_2px_0px_0px_#F27D26]"
              style={{ backgroundColor: avatarColor }}
            >
              {username ? username.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <span className="text-[10px] font-black text-[#F27D26] uppercase tracking-widest">Commuter Identity</span>
              <h3 className="text-base font-black text-white uppercase tracking-tight">Social Profile &amp; Username</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white text-[#141414] hover:bg-[#F27D26] hover:text-white border-2 border-[#141414] flex items-center justify-center transition font-black cursor-pointer shadow-[2px_2px_0px_0px_#F27D26]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {savedSuccess ? (
          <div className="p-8 text-center bg-[#F5F5F0]">
            <div className="w-14 h-14 bg-[#141414] text-[#F27D26] border-2 border-[#141414] shadow-[4px_4px_0px_0px_#F27D26] flex items-center justify-center mx-auto mb-3 animate-bounce">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h4 className="text-lg font-black text-[#141414] uppercase">Profile Saved!</h4>
            <p className="text-xs font-bold text-stone-600 mt-1">
              Your username <span className="text-[#141414] underline font-black">{username}</span> will be displayed on all your comments, reviews, and reports.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-4 sm:p-5 space-y-4">
            {/* Live Profile Card Preview */}
            <div className="bg-[#F5F5F0] border-2 border-[#141414] p-3.5 flex items-center gap-3">
              <div 
                className="w-12 h-12 flex items-center justify-center text-lg font-black text-white border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414] flex-shrink-0"
                style={{ backgroundColor: avatarColor }}
              >
                {username ? username.charAt(0).toUpperCase() : 'C'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-sm text-[#141414] truncate">
                    {username || 'Anonymous Commuter'}
                  </span>
                  <span className="bg-[#141414] text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border border-[#141414]">
                    {badge}
                  </span>
                </div>
                <p className="text-xs text-stone-500 font-bold tracking-tight truncate">
                  {handle || '@commuter'}
                </p>
                <div className="flex items-center gap-3 mt-1 text-[10px] font-black text-[#141414]/70 uppercase">
                  <span>Score: {profile.reputation_score} pts</span>
                  <span>•</span>
                  <span>{profile.reports_count} contributions</span>
                </div>
              </div>
            </div>

            {/* Username Field */}
            <div>
              <label className="block text-xs font-black text-[#141414] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#F27D26]" />
                Choose Your Commuter Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="e.g. Tinashe_Byo, KombiWatcher, Mai_Panashe"
                maxLength={24}
                required
                className="w-full bg-white border-2 border-[#141414] p-2.5 text-sm font-black text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
              />
              <p className="text-[10px] text-stone-500 font-bold mt-1">
                This name identifies you across community comments, likes, reviews, and fare reports.
              </p>
            </div>

            {/* Handle & Badge Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-[#141414] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <AtSign className="w-3.5 h-3.5 text-[#F27D26]" />
                  Social Handle
                </label>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="@handle"
                  className="w-full bg-white border-2 border-[#141414] p-2 text-xs font-bold text-[#141414] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#141414] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-[#F27D26]" />
                  Commuter Badge
                </label>
                <select
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  className="w-full bg-white border-2 border-[#141414] p-2 text-xs font-bold text-[#141414] focus:outline-none"
                >
                  {BADGE_OPTIONS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Avatar Color Picker */}
            <div>
              <label className="block text-xs font-black text-[#141414] uppercase tracking-wider mb-2">
                Avatar Badge Color
              </label>
              <div className="flex items-center gap-2">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setAvatarColor(color)}
                    className={`w-7 h-7 border-2 border-[#141414] cursor-pointer transition transform active:scale-95 ${
                      avatarColor === color ? 'ring-2 ring-offset-2 ring-[#141414] scale-110 shadow-[2px_2px_0px_0px_#141414]' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Optional Phone */}
            <div>
              <label className="block text-xs font-black text-[#141414] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#F27D26]" />
                Phone Number (Optional - Transporters &amp; Drivers)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +263 77 123 4567"
                className="w-full bg-white border-2 border-[#141414] p-2 text-xs font-bold text-[#141414] focus:outline-none"
              />
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!username.trim()}
                className="w-full py-3 bg-[#141414] text-white border-2 border-[#141414] shadow-[4px_4px_0px_0px_#F27D26] uppercase font-black tracking-wider text-xs hover:bg-[#F27D26] hover:text-white transition active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Save Commuter Profile</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

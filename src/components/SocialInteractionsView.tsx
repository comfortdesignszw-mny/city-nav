import React, { useState, useMemo } from 'react';
import { 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown, 
  Star, 
  ShieldAlert, 
  Coins, 
  Clock, 
  MapPin, 
  User, 
  PlusCircle, 
  Plus,
  Sparkles, 
  Wifi, 
  Wind, 
  BatteryCharging, 
  Luggage, 
  Filter,
  CheckCircle2,
  AlertTriangle,
  Bus,
  Car
} from 'lucide-react';
import { useOfflineStore } from '../hooks/useOfflineStore';
import { CommuterSocialInteraction } from '../types';
import { formatTimeAgo, formatCurrency } from '../utils/formatters';
import { AddReviewAbuseModal } from './AddReviewAbuseModal';
import { UserProfileModal } from './UserProfileModal';

export const SocialInteractionsView: React.FC = () => {
  const store = useOfflineStore();
  const interactions = store.getAllSocialInteractions();
  const profile = store.getUserProfile();
  const routes = store.getRoutes();

  const [activeFilter, setActiveFilter] = useState<'all' | 'intercity' | 'route' | 'fares' | 'abuse'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Filtered interactions
  const filteredInteractions = useMemo(() => {
    return interactions.filter((item) => {
      if (activeFilter === 'intercity') return item.targetType === 'intercity' || item.targetType === 'operator';
      if (activeFilter === 'route') return item.targetType === 'route';
      if (activeFilter === 'fares') return !!item.confirmedFare;
      if (activeFilter === 'abuse') return !!item.isAbuseReport;
      return true;
    });
  }, [interactions, activeFilter]);

  return (
    <div className="space-y-4">
      {/* Social Banner & User Profile Bar */}
      <div className="bg-white border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-[#F27D26] text-white px-2 py-0.5 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Live Commuter Feed
              </span>
              <span className="text-xs text-stone-500 font-bold">
                Real-Time Passenger Intel
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#141414] uppercase tracking-tight">
              Social Commuter Buzz &amp; Reviews
            </h2>
            <p className="text-xs font-bold text-stone-600 mt-1 max-w-xl">
              Rate intercity coaches &amp; local routes, approve live fares in Rands, Pula, USD &amp; ZiG, review onboard amenities, and report reckless operators.
            </p>
          </div>

          {/* User Profile Pill & Quick Post */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="p-2 bg-[#F5F5F0] hover:bg-white border-2 border-[#141414] text-xs font-black text-[#141414] flex items-center gap-2 transition cursor-pointer shadow-[2px_2px_0px_0px_#141414]"
              title="Edit commuter username & profile"
            >
              <div 
                className="w-5 h-5 flex items-center justify-center text-[10px] font-black text-white border border-[#141414]"
                style={{ backgroundColor: profile.avatarColor || '#F27D26' }}
              >
                {profile.username ? profile.username.charAt(0).toUpperCase() : 'U'}
              </div>
              <span>{profile.username || 'Commuter'}</span>
              <span className="text-[9px] text-[#F27D26] font-bold underline">Edit</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="py-2.5 px-4 bg-[#141414] text-white border-2 border-[#141414] shadow-[3px_3px_0px_0px_#F27D26] hover:bg-[#F27D26] hover:text-white transition font-black text-xs uppercase tracking-wider cursor-pointer flex items-center gap-2 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Post Buzz / Review</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mt-4 pt-3 border-t-2 border-stone-200 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-[#141414] transition cursor-pointer whitespace-nowrap ${
              activeFilter === 'all'
                ? 'bg-[#141414] text-white shadow-[2px_2px_0px_0px_#F27D26]'
                : 'bg-white text-stone-700 hover:bg-stone-100'
            }`}
          >
            All Buzz ({interactions.length})
          </button>

          <button
            onClick={() => setActiveFilter('intercity')}
            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-[#141414] transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeFilter === 'intercity'
                ? 'bg-[#141414] text-white shadow-[2px_2px_0px_0px_#F27D26]'
                : 'bg-white text-stone-700 hover:bg-stone-100'
            }`}
          >
            <Bus className="w-3.5 h-3.5 text-[#F27D26]" />
            <span>Intercity Coaches</span>
          </button>

          <button
            onClick={() => setActiveFilter('route')}
            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-[#141414] transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeFilter === 'route'
                ? 'bg-[#141414] text-white shadow-[2px_2px_0px_0px_#F27D26]'
                : 'bg-white text-stone-700 hover:bg-stone-100'
            }`}
          >
            <Car className="w-3.5 h-3.5 text-[#F27D26]" />
            <span>Local Routes</span>
          </button>

          <button
            onClick={() => setActiveFilter('fares')}
            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-[#141414] transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeFilter === 'fares'
                ? 'bg-[#141414] text-white shadow-[2px_2px_0px_0px_#F27D26]'
                : 'bg-white text-stone-700 hover:bg-stone-100'
            }`}
          >
            <Coins className="w-3.5 h-3.5 text-[#F27D26]" />
            <span>Confirmed Fares</span>
          </button>

          <button
            onClick={() => setActiveFilter('abuse')}
            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-[#141414] transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeFilter === 'abuse'
                ? 'bg-[#EF4444] text-white shadow-[2px_2px_0px_0px_#141414]'
                : 'bg-red-50 text-[#EF4444] hover:bg-red-100'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Abuse Reports ({interactions.filter(i => i.isAbuseReport).length})</span>
          </button>
        </div>
      </div>

      {/* Social Feed List */}
      <div className="space-y-3">
        {filteredInteractions.length === 0 ? (
          <div className="p-8 sm:p-10 text-center bg-white border-2 border-[#141414] shadow-[6px_6px_0px_0px_#141414] space-y-4">
            <div className="w-16 h-16 bg-[#F5F5F0] border-2 border-[#141414] shadow-[3px_3px_0px_0px_#F27D26] flex items-center justify-center mx-auto text-[#141414]">
              <MessageSquare className="w-8 h-8 text-[#F27D26]" />
            </div>
            
            <div className="space-y-1.5 max-w-md mx-auto">
              <span className="text-[10px] font-black text-[#F27D26] uppercase tracking-widest block">
                Fresh Board Ready for Community
              </span>
              <h3 className="text-lg sm:text-xl font-black text-[#141414] uppercase tracking-tight">
                {interactions.length === 0 ? 'No Commuter Buzz or Reviews Yet' : 'No Posts in this Category'}
              </h3>
              <p className="text-xs sm:text-sm font-medium text-stone-600 leading-relaxed">
                {interactions.length === 0 
                  ? 'Nothing has been created yet! This board is clean for production. Share your latest bus or kombi trip, confirm a fare, ask a route question, or report road updates to help fellow travellers.' 
                  : 'Nothing has been posted under this filter yet. Be the first to share an update here or reset your filter to view all discussions.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="py-3 px-6 bg-[#141414] text-white hover:bg-[#F27D26] transition font-black text-xs sm:text-sm uppercase tracking-wider border-2 border-[#141414] shadow-[4px_4px_0px_0px_#F27D26] flex items-center gap-2 cursor-pointer active:translate-x-[1px] active:translate-y-[1px]"
              >
                <Plus className="w-4 h-4" />
                <span>+ Post to Commuter Buzz</span>
              </button>

              {activeFilter !== 'all' && (
                <button
                  onClick={() => setActiveFilter('all')}
                  className="py-3 px-4 bg-[#F5F5F0] text-[#141414] hover:bg-stone-200 transition font-black text-xs sm:text-sm uppercase tracking-wider border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414] cursor-pointer"
                >
                  Show All Categories ({interactions.length})
                </button>
              )}
            </div>
          </div>
        ) : (
          filteredInteractions.map((item) => {
            const isAbuse = item.isAbuseReport;

            return (
              <div 
                key={item.id}
                className={`bg-white border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414] p-4 transition ${
                  isAbuse ? 'border-l-8 border-l-[#EF4444]' : ''
                }`}
              >
                {/* User & Route Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div 
                      className="w-9 h-9 flex items-center justify-center font-black text-white border-2 border-[#141414] shadow-[1px_1px_0px_0px_#141414] flex-shrink-0 text-sm"
                      style={{ backgroundColor: item.avatarBg || '#F27D26' }}
                    >
                      {item.username.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-xs text-[#141414] truncate">
                          {item.username}
                        </span>
                        <span className="text-[10px] text-stone-400 font-bold">
                          {item.userHandle}
                        </span>
                        {item.userBadge && (
                          <span className="bg-[#141414] text-white px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider">
                            {item.userBadge}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-stone-500 font-bold flex items-center gap-1">
                        <span>on</span>
                        <span className="text-[#141414] font-black underline uppercase">{item.targetName}</span>
                        <span>•</span>
                        <span>{formatTimeAgo(item.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Rating Stars or Abuse Alert Pill */}
                  <div>
                    {isAbuse ? (
                      <span className="bg-[#EF4444] text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        Abuse Alert
                      </span>
                    ) : item.rating ? (
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star 
                            key={s} 
                            className={`w-3.5 h-3.5 ${
                              s <= item.rating! ? 'fill-[#F27D26] text-[#141414]' : 'text-stone-200'
                            }`} 
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Comment Content */}
                <p className="text-xs font-bold text-stone-800 leading-relaxed my-2">
                  {item.comment}
                </p>

                {/* Abuse Details Banner (if applicable) */}
                {isAbuse && (
                  <div className="bg-red-50 border border-red-200 p-2 text-xs font-bold text-red-900 mb-2 flex items-center justify-between flex-wrap gap-2">
                    <span className="uppercase font-black text-[10px] text-[#EF4444]">
                      Type: {item.abuseType?.replace(/_/g, ' ')}
                    </span>
                    {item.abusePlateNumber && (
                      <span className="bg-white border border-red-300 px-1 text-[10px] font-black text-[#141414]">
                        Plate: {item.abusePlateNumber}
                      </span>
                    )}
                    {item.abuseLocation && (
                      <span className="text-[10px] text-stone-600">
                        Near: {item.abuseLocation}
                      </span>
                    )}
                  </div>
                )}

                {/* Meta Highlights: Confirmed Fare & Departure Time */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {item.confirmedFare && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-300 text-emerald-900 text-[10px] font-black uppercase">
                      <Coins className="w-3 h-3 text-emerald-600" />
                      <span>Confirmed Fare: {formatCurrency(item.confirmedFare.amount, item.confirmedFare.currency)}</span>
                    </div>
                  )}

                  {item.confirmedDepartureTime && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-300 text-blue-900 text-[10px] font-black uppercase">
                      <Clock className="w-3 h-3 text-blue-600" />
                      <span>{item.confirmedDepartureTime}</span>
                    </div>
                  )}
                </div>

                {/* Coach Amenities Badges (if provided) */}
                {item.amenitiesReview && (
                  <div className="p-2 bg-[#F5F5F0] border border-stone-200 mb-2 flex items-center gap-2 flex-wrap text-[10px] font-black uppercase text-stone-700">
                    <span className="text-stone-400">Amenities:</span>
                    <span className={`px-1.5 py-0.5 border ${item.amenitiesReview.acWorking ? 'bg-emerald-100 border-emerald-300 text-emerald-900' : 'bg-stone-200 border-stone-300 text-stone-500'}`}>
                      AC: {item.amenitiesReview.acWorking ? 'Working' : 'None'}
                    </span>
                    <span className={`px-1.5 py-0.5 border ${item.amenitiesReview.usbCharging ? 'bg-emerald-100 border-emerald-300 text-emerald-900' : 'bg-stone-200 border-stone-300 text-stone-500'}`}>
                      USB: {item.amenitiesReview.usbCharging ? 'Available' : 'Faulty'}
                    </span>
                    <span className={`px-1.5 py-0.5 border ${item.amenitiesReview.wifiWorking ? 'bg-emerald-100 border-emerald-300 text-emerald-900' : 'bg-stone-200 border-stone-300 text-stone-500'}`}>
                      Wi-Fi: {item.amenitiesReview.wifiWorking ? 'Active' : 'No'}
                    </span>
                    <span className={`px-1.5 py-0.5 border ${item.amenitiesReview.luggageSecurity ? 'bg-emerald-100 border-emerald-300 text-emerald-900' : 'bg-stone-200 border-stone-300 text-stone-500'}`}>
                      Luggage: {item.amenitiesReview.luggageSecurity ? 'Safe/Tagged' : 'Risky'}
                    </span>
                  </div>
                )}

                {/* Social Actions: Like & Dislike */}
                <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => store.reactSocialInteraction(item.id, 'like')}
                      className={`px-2 py-1 text-xs font-black uppercase border border-[#141414] transition cursor-pointer flex items-center gap-1 ${
                        item.userReaction === 'like'
                          ? 'bg-[#141414] text-[#F27D26] shadow-[1px_1px_0px_0px_#F27D26]'
                          : 'bg-white text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{item.likes}</span>
                    </button>

                    <button
                      onClick={() => store.reactSocialInteraction(item.id, 'dislike')}
                      className={`px-2 py-1 text-xs font-black uppercase border border-[#141414] transition cursor-pointer flex items-center gap-1 ${
                        item.userReaction === 'dislike'
                          ? 'bg-[#EF4444] text-white shadow-[1px_1px_0px_0px_#141414]'
                          : 'bg-white text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                      <span>{item.dislikes}</span>
                    </button>
                  </div>

                  <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                    Fambai Verified Commuter
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Global Add Review/Abuse Modal */}
      {isAddModalOpen && (
        <AddReviewAbuseModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          targetType="route"
          targetId={routes[0]?.id || 'route-harare-chitungwiza'}
          targetName={routes[0]?.name || 'City Centre ↔ Chitungwiza'}
        />
      )}

      {/* User Profile Customization Modal */}
      {isProfileModalOpen && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}
    </div>
  );
};

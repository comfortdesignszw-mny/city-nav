/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Header, NavTab } from './components/Header';
import { HomeRouteSearch } from './components/HomeRouteSearch';
import { IntercityTravelView } from './components/IntercityTravelView';
import { TransportersView } from './components/TransportersView';
import { SocialInteractionsView } from './components/SocialInteractionsView';
import { RankFinderView } from './components/RankFinderView';
import { MyReportsView } from './components/MyReportsView';
import { RouteDetailModal } from './components/RouteDetailModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { Info, Bus, ShieldCheck, Zap } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('routes');
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedRankId, setSelectedRankId] = useState<string | null>(null);
  const [showWelcomeNotice, setShowWelcomeNotice] = useState(true);

  const handleSelectRoute = (routeId: string) => {
    setSelectedRouteId(routeId);
  };

  const handleSelectRank = (rankId: string) => {
    setSelectedRankId(rankId);
    setActiveTab('ranks');
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#141414] flex flex-col font-sans selection:bg-[#F27D26] selection:text-white">
      {/* Top Header */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-3.5 sm:p-6 space-y-6">
        {/* Commuter Intro Notice Banner (Dismissible) */}
        {showWelcomeNotice && (
          <div className="bg-[#141414] text-white border-2 border-[#141414] shadow-[4px_4px_0px_0px_#F27D26] p-4 sm:p-5 relative overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 bg-[#F27D26] text-white border-2 border-[#141414] flex items-center justify-center font-black flex-shrink-0 mt-0.5 shadow-[2px_2px_0px_0px_#ffffff]">
                  <Bus className="w-5 h-5 text-white" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-base sm:text-lg font-black tracking-tight text-white uppercase">
                      THE CITY NAV.
                    </span>
                    <span className="text-xs font-black uppercase tracking-widest text-[#F27D26]">
                      Fambai (Shona) • Hambani (Ndebele)
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-stone-300 leading-snug max-w-2xl">
                    Crowdsourced transit intelligence for Zimbabwe. Instant cached load, live multi-currency fares (USD, ZiG, Rand, Pula), verified transporters &amp; kombis, coach amenities &amp; abuse reports, GPS terminus finder, and police blitz alerts.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowWelcomeNotice(false)}
                className="text-stone-400 hover:text-white hover:bg-stone-800 text-xs font-black px-2 py-1 border border-stone-700 transition flex-shrink-0 cursor-pointer"
                title="Dismiss notice"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: Routes & Fares (Home / Search) */}
        {activeTab === 'routes' && (
          <HomeRouteSearch 
            onSelectRoute={handleSelectRoute}
            onSelectRank={handleSelectRank}
          />
        )}

        {/* Tab 2: Dedicated Intercity Bus Knowledgebase */}
        {activeTab === 'intercity' && (
          <IntercityTravelView 
            onSelectRoute={handleSelectRoute}
          />
        )}

        {/* Tab 3: Transporters & Operators Registry */}
        {activeTab === 'transporters' && (
          <TransportersView />
        )}

        {/* Tab 4: Commuter Buzz & Social Interactions Feed */}
        {activeTab === 'buzz' && (
          <SocialInteractionsView onSelectRoute={handleSelectRoute} />
        )}

        {/* Tab 5: Ranks Map & Lightweight GPS Termini */}
        {activeTab === 'ranks' && (
          <RankFinderView
            onSelectRoute={handleSelectRoute}
            selectedRankId={selectedRankId}
          />
        )}

        {/* Tab 6: My Reports & Outbox */}
        {activeTab === 'my-reports' && (
          <MyReportsView 
            onSelectRoute={handleSelectRoute}
          />
        )}
      </main>

      {/* Bold Typography Theme Footer */}
      <footer className="p-4 sm:p-6 border-t-2 border-[#141414] bg-[#F5F5F0] flex flex-col sm:flex-row justify-between items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#141414]/70 mt-auto">
        <span>Commuter Crowdsourcing Engine v1.0.4</span>
        <span>© Fambai Hambani Travel Network • Harare, ZW</span>
        <span>Built for Low-Connectivity Environments</span>
      </footer>

      {/* Route Detail Modal */}
      {selectedRouteId && (
        <RouteDetailModal
          routeId={selectedRouteId}
          isOpen={!!selectedRouteId}
          onClose={() => setSelectedRouteId(null)}
          onSelectRank={handleSelectRank}
        />
      )}

      {/* Offline Toast & Outbox Sync Indicator */}
      <OfflineIndicator />
    </div>
  );
}

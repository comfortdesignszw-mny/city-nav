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
import { LegalDocsModal, LegalDocTab } from './components/LegalDocsModal';
import { FileText, Lock, ShieldCheck } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('routes');
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedRankId, setSelectedRankId] = useState<string | null>(null);
  const [showWelcomeNotice, setShowWelcomeNotice] = useState(true);
  const [legalDocTab, setLegalDocTab] = useState<LegalDocTab | null>(null);

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
                <img
                  src="/pwa-192x192.png"
                  alt="Fambai Travel 3D Kombi"
                  className="w-10 h-10 object-cover border-2 border-[#141414] flex-shrink-0 mt-0.5 shadow-[2px_2px_0px_0px_#ffffff] bg-[#141414]"
                />
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
                    Crowdsourced transit intelligence for Zimbabwe. Instant offline SQLite &amp; cloud sync, live 3-currency fares (USD, ZWG, ZAR), one-tap boarding check-ins, verified transporters &amp; kombis, and community reviews.
                  </p>
                  <div className="pt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs font-bold text-white border-t border-stone-700/80 mt-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#F27D26] flex-shrink-0" />
                    <span>Read our</span>
                    <button
                      type="button"
                      onClick={() => setLegalDocTab('terms')}
                      className="underline decoration-[#F27D26] decoration-2 underline-offset-2 text-[#F27D26] hover:text-white font-black uppercase tracking-wide cursor-pointer transition"
                    >
                      Terms of Use
                    </button>
                    <span>and</span>
                    <button
                      type="button"
                      onClick={() => setLegalDocTab('privacy')}
                      className="underline decoration-[#F27D26] decoration-2 underline-offset-2 text-[#F27D26] hover:text-white font-black uppercase tracking-wide cursor-pointer transition"
                    >
                      Privacy Policy
                    </button>
                    <span>before using this app.</span>
                  </div>
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
            onNavigateToBuzz={() => setActiveTab('buzz')}
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
      <footer className="p-4 sm:p-6 border-t-2 border-[#141414] bg-[#F5F5F0] flex flex-col sm:flex-row justify-between items-center gap-3 text-[10px] font-black uppercase tracking-widest text-[#141414]/70 mt-auto">
        <span>Commuter Crowdsourcing Engine v1.0.4</span>
        <span>© Fambai Hambani Travel Network • Harare, ZW</span>
        <div className="flex items-center gap-3 flex-wrap justify-center">
          <button
            type="button"
            onClick={() => setLegalDocTab('terms')}
            className="inline-flex items-center gap-1 text-[#141414] hover:text-[#F27D26] underline underline-offset-2 cursor-pointer transition"
          >
            <FileText className="w-3 h-3" />
            <span>Terms of Use</span>
          </button>
          <span aria-hidden="true">•</span>
          <button
            type="button"
            onClick={() => setLegalDocTab('privacy')}
            className="inline-flex items-center gap-1 text-[#141414] hover:text-[#F27D26] underline underline-offset-2 cursor-pointer transition"
          >
            <Lock className="w-3 h-3" />
            <span>Privacy Policy</span>
          </button>
        </div>
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

      {/* Legal Docs Modal (Terms of Use & Privacy Policy) */}
      <LegalDocsModal
        isOpen={legalDocTab !== null}
        activeDoc={legalDocTab || 'terms'}
        onChangeDoc={(tab) => setLegalDocTab(tab)}
        onClose={() => setLegalDocTab(null)}
      />

      {/* Offline Toast & Outbox Sync Indicator */}
      <OfflineIndicator />
    </div>
  );
}

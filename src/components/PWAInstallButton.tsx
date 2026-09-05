import React, { useState } from 'react';
import { Download, Share2, Smartphone, Check, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'full' | 'banner';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'compact', className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Suppress completely if already installed as standalone
  if (isInstalled || dismissed) {
    return null;
  }

  // Handle Install Click
  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // Fallback for desktop browsers without active prompt or already queued
      setShowIOSModal(true);
    }
  };

  return (
    <>
      {variant === 'compact' && (
        <button
          onClick={handleInstallClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase tracking-wider bg-[#F27D26] hover:bg-[#d66513] text-white rounded-md transition-colors shadow-sm ${className}`}
          title="Install as native offline app"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install App</span>
        </button>
      )}

      {variant === 'banner' && (
        <div className={`bg-[#141414] text-white border-b border-stone-800 px-4 py-2.5 flex items-center justify-between gap-3 text-xs ${className}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#F27D26] flex items-center justify-center text-white font-black text-xs shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-stone-100 leading-tight">Install Fambai Offline App</p>
              <p className="text-[11px] text-stone-400">Save kombi & bus fares offline • Zero data browsing</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1 bg-[#F27D26] hover:bg-[#d66513] text-white font-black text-[11px] uppercase tracking-wider rounded transition-colors shadow-sm"
            >
              Install
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 text-stone-400 hover:text-white rounded"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {variant === 'full' && (
        <div className={`p-4 bg-white border border-stone-300 rounded-lg shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${className}`}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#141414] text-[#F27D26] flex items-center justify-center font-black text-base shrink-0 border border-stone-800">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-black text-sm text-[#141414] uppercase tracking-wide">
                Install Standalone Application
              </h4>
              <p className="text-xs text-stone-600 mt-0.5">
                Install on your Android, iPhone, Windows or Mac desktop for instant home-screen launch, full offline fare calculation, and push alerts.
              </p>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            className="w-full sm:w-auto px-4 py-2 bg-[#F27D26] hover:bg-[#d66513] text-white text-xs font-black uppercase tracking-wider rounded-md transition-colors flex items-center justify-center gap-2 shrink-0 shadow-sm"
          >
            <Download className="w-4 h-4" />
            Install Standalone
          </button>
        </div>
      )}

      {/* Guided Instructions Modal (iOS Safari & Unsupported Desktop browsers) */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white border border-stone-300 rounded-xl p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#F27D26] text-white flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-[#141414] uppercase">
                  Install Fambai App
                </h3>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-4 text-xs text-stone-700">
                <p className="font-semibold text-stone-900">
                  Follow these simple steps on your iPhone or iPad:
                </p>
                <div className="space-y-3 bg-[#F5F5F0] p-4 rounded-lg border border-stone-200">
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#141414] text-white flex items-center justify-center font-bold text-[11px] shrink-0">1</span>
                    <p>
                      Tap the <strong className="text-stone-900 font-bold">Share</strong> button <Share2 className="w-3.5 h-3.5 inline mx-1 text-blue-600" /> in Safari's bottom toolbar.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#141414] text-white flex items-center justify-center font-bold text-[11px] shrink-0">2</span>
                    <p>
                      Scroll down and tap <strong className="text-stone-900 font-bold">Add to Home Screen</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#141414] text-white flex items-center justify-center font-bold text-[11px] shrink-0">3</span>
                    <p>
                      Tap <strong className="text-stone-900 font-bold">Add</strong> in the top-right corner to launch anytime without browser tabs.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs text-stone-700">
                <p className="font-semibold text-stone-900">
                  To install on your browser or computer:
                </p>
                <div className="space-y-3 bg-[#F5F5F0] p-4 rounded-lg border border-stone-200">
                  <div className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p>
                      <strong className="text-stone-900">Chrome / Edge (Desktop & Android):</strong> Click the install icon in the address bar or open browser menu <strong className="text-stone-900">&gt; Install Fambai/Hambani Travel</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p>
                      <strong className="text-stone-900">Offline Ready:</strong> Once installed, launch directly from your home screen or desktop application list with full offline caching.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowIOSModal(false)}
                className="w-full py-2.5 bg-[#141414] text-white text-xs font-black uppercase tracking-wider rounded-lg hover:bg-stone-800 transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

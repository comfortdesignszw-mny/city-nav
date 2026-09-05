import React, { useState } from 'react';
import { 
  Share2, 
  X, 
  Copy, 
  Check, 
  MessageSquare, 
  Car, 
  Clock, 
  ThumbsUp, 
  Send, 
  ExternalLink,
  Sparkles,
  Smartphone
} from 'lucide-react';
import { FareReport, StatusReport } from '../types';
import { formatCurrency, formatTimeAgo } from '../utils/formatters';
import { useOfflineStore } from '../hooks/useOfflineStore';

interface ShareFareModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'single' | 'all';
  fare?: FareReport;
  allFares?: FareReport[];
  allAlerts?: StatusReport[];
  onNavigateToBuzz?: () => void;
}

export const ShareFareModal: React.FC<ShareFareModalProps> = ({
  isOpen,
  onClose,
  mode,
  fare,
  allFares = [],
  allAlerts = [],
  onNavigateToBuzz,
}) => {
  const store = useOfflineStore();
  const [copied, setCopied] = useState(false);
  const [internalComment, setInternalComment] = useState('');
  const [buzzShared, setBuzzShared] = useState(false);
  const [activeTab, setActiveTab] = useState<'external' | 'internal'>('external');

  if (!isOpen) return null;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://fambai.app';
  const shareUrl = fare?.route_id 
    ? `${baseUrl}/?tab=routes&route=${encodeURIComponent(fare.route_id)}`
    : `${baseUrl}/?tab=routes`;

  // Construct text for Single Card
  const singleText = fare
    ? `🇿🇼 *Fambai Travel • Live Transit & Fare Update*\n` +
      `📍 *Route:* ${fare.route_name || 'Commuter Route'} (${fare.city || 'Zimbabwe'})\n` +
      `💵 *Current Fare:* ${formatCurrency(fare.fare_amount, fare.currency)}\n` +
      `🚐 *Vehicle Type:* ${fare.transport_type || 'Toyota HiAce Kombi'}\n` +
      `⏱️ *Departure:* ${fare.departure_status || 'Loading right now'}\n` +
      `👍 *Community Verification:* ${fare.upvotes} upvotes (${formatTimeAgo(fare.reported_at)})\n\n` +
      `📲 *View live kombi fares & road blitzes:* ${shareUrl}`
    : '';

  // Construct text for All Latest Live Fares
  const allText = 
    `🇿🇼 *Fambai Travel • Live Zimbabwe Fares Digest*\n` +
    `Real-time crowdsourced kombi & bus fares across Zimbabwe:\n\n` +
    (allFares.slice(0, 5).map((f, i) => 
      `${i + 1}. *${f.route_name}* (${f.city})\n   • Fare: ${formatCurrency(f.fare_amount, f.currency)} (${f.transport_type || 'Kombi'})\n   • Status: ${f.departure_status || 'Active'}`
    ).join('\n\n')) +
    (allAlerts.length > 0 ? `\n\n⚠️ *Live Road Alerts:*\n• ${allAlerts[0].route_name || 'Traffic Alert'}: ${allAlerts[0].note || allAlerts[0].type}` : '') +
    `\n\n📲 *Browse all 60+ routes offline:* ${shareUrl}`;

  const currentShareText = mode === 'single' ? singleText : allText;
  const shareTitle = mode === 'single' 
    ? `Live Fare: ${fare?.route_name || 'Zimbabwe Transit'}` 
    : 'Zimbabwe Live Kombi & Bus Fares Digest';

  // Native Web Share
  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: currentShareText,
          url: shareUrl,
        });
      } catch (err) {
        // User dismissed or share failed
      }
    } else {
      handleCopy();
    }
  };

  // WhatsApp Share
  const handleWhatsAppShare = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(currentShareText)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // Twitter / X Share
  const handleTwitterShare = () => {
    const textSnippet = mode === 'single' && fare 
      ? `Live fare for ${fare.route_name}: ${formatCurrency(fare.fare_amount, fare.currency)} (${fare.transport_type || 'Kombi'}). Verified on @FambaiTravel.`
      : `Check the latest live kombi & bus fares across Zimbabwe on Fambai Travel.`;
    const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(textSnippet)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twUrl, '_blank', 'noopener,noreferrer');
  };

  // Copy to Clipboard
  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentShareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Share internally to Commuter Buzz & Reviews
  const handleShareToBuzz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fare && mode === 'single') return;

    const routeName = fare?.route_name || 'Zimbabwe Commuter Corridor';
    const targetRouteId = fare?.route_id || 'general';

    const commentBody = internalComment.trim() 
      ? `${internalComment.trim()} — [Shared Live Fare: ${fare ? formatCurrency(fare.fare_amount, fare.currency) : 'Verified Fares'} for ${routeName}, ${fare?.transport_type || 'Kombi'}]`
      : `Verified live fare: ${fare ? formatCurrency(fare.fare_amount, fare.currency) : 'Current rates'} for ${routeName} (${fare?.transport_type || 'Kombi'}). ${fare?.departure_status || 'Loading now'}.`;

    store.addSocialInteraction({
      targetType: 'route',
      targetId: targetRouteId,
      targetName: routeName,
      comment: commentBody,
      confirmedFare: fare ? {
        amount: fare.fare_amount,
        currency: fare.currency
      } : undefined,
      confirmedDepartureTime: fare?.departure_status || 'Live departure confirmed',
      rating: 5,
    });

    setBuzzShared(true);
    setTimeout(() => {
      setBuzzShared(false);
      onClose();
      if (onNavigateToBuzz) onNavigateToBuzz();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-white border-2 border-[#141414] shadow-[8px_8px_0px_0px_#141414] flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-[#141414] text-white border-b-2 border-[#141414] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#F27D26] text-white border border-white flex items-center justify-center font-black">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-black text-[#F27D26] uppercase tracking-widest">
                Crowdsourced Transit Sharing
              </span>
              <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-tight">
                {mode === 'single' ? 'Share Live Fare Card' : "Share Today's Fares Digest"}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white text-[#141414] hover:bg-[#F27D26] hover:text-white border border-[#141414] flex items-center justify-center font-black cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher: External Social vs Internal Commuter Buzz */}
        <div className="flex border-b-2 border-[#141414] bg-[#F5F5F0] shrink-0">
          <button
            onClick={() => setActiveTab('external')}
            className={`flex-1 py-2.5 px-3 text-xs font-black uppercase tracking-wider transition border-r-2 border-[#141414] flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'external'
                ? 'bg-white text-[#141414] shadow-[inset_0_-2px_0_0_#F27D26]'
                : 'text-stone-600 hover:text-[#141414]'
            }`}
          >
            <Share2 className="w-3.5 h-3.5 text-[#F27D26]" />
            <span>External Socials</span>
          </button>
          <button
            onClick={() => setActiveTab('internal')}
            className={`flex-1 py-2.5 px-3 text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'internal'
                ? 'bg-white text-[#141414] shadow-[inset_0_-2px_0_0_#F27D26]'
                : 'text-stone-600 hover:text-[#141414]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#F27D26]" />
            <span>Post to Commuter Buzz</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {activeTab === 'external' ? (
            <>
              {/* Card Preview */}
              <div className="bg-[#F5F5F0] border-2 border-[#141414] p-3.5 text-xs">
                <div className="flex items-center justify-between gap-2 border-b border-stone-300 pb-2 mb-2">
                  <span className="text-[10px] font-black uppercase bg-[#141414] text-white px-1.5 py-0.5">
                    Fambai Card Preview
                  </span>
                  <span className="text-[10px] font-bold text-stone-500">
                    Includes direct rerouting URL
                  </span>
                </div>

                {mode === 'single' && fare ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-sm uppercase text-[#141414]">
                        {fare.route_name || 'Commuter Corridor'}
                      </h4>
                      <span className="text-base font-black text-[#F27D26]">
                        {formatCurrency(fare.fare_amount, fare.currency)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-stone-700 text-[11px] font-bold">
                      <span className="bg-amber-100 px-1.5 py-0.5 border border-amber-300 text-[#141414]">
                        {fare.transport_type || 'HiAce Kombi'}
                      </span>
                      <span>● {fare.departure_status || 'Loading right now'}</span>
                    </div>
                    <p className="text-[10px] font-medium text-stone-500">
                      Reported {formatTimeAgo(fare.reported_at)} • {fare.upvotes} Upvotes
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <h4 className="font-black text-xs uppercase text-[#141414]">
                      Zimbabwe Live Fares Digest ({allFares.length} Active Routes)
                    </h4>
                    <p className="text-[11px] text-stone-600 font-medium">
                      Multi-currency fare breakdown (USD, ZiG, Rand, Pula) with active traffic roadblocks and rank statuses.
                    </p>
                  </div>
                )}

                <div className="mt-2.5 pt-2 border-t border-stone-300 flex items-center justify-between text-[10px] font-bold text-stone-500 truncate">
                  <span className="truncate">{shareUrl}</span>
                  <span className="text-[#F27D26] uppercase font-black ml-2 shrink-0">Deep Link</span>
                </div>
              </div>

              {/* Social Sharing Buttons */}
              <div className="space-y-2">
                <p className="text-xs font-black uppercase text-[#141414] tracking-wider">
                  Select Share Destination:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* WhatsApp */}
                  <button
                    onClick={handleWhatsAppShare}
                    className="p-3 bg-[#25D366] hover:bg-[#20bd5a] text-white border-2 border-[#141414] shadow-[3px_3px_0px_0px_#141414] transition font-black text-xs uppercase flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share on WhatsApp</span>
                  </button>

                  {/* Native Device Share */}
                  <button
                    onClick={handleNativeShare}
                    className="p-3 bg-[#141414] hover:bg-stone-800 text-white border-2 border-[#141414] shadow-[3px_3px_0px_0px_#F27D26] transition font-black text-xs uppercase flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4 text-[#F27D26]" />
                    <span>Native Share (Phone/PC)</span>
                  </button>

                  {/* Twitter / X */}
                  <button
                    onClick={handleTwitterShare}
                    className="p-3 bg-stone-900 hover:bg-black text-white border-2 border-[#141414] shadow-[3px_3px_0px_0px_#141414] transition font-black text-xs uppercase flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Post on X / Twitter</span>
                  </button>

                  {/* Copy Text & Deep Link */}
                  <button
                    onClick={handleCopy}
                    className="p-3 bg-white hover:bg-stone-100 text-[#141414] border-2 border-[#141414] shadow-[3px_3px_0px_0px_#141414] transition font-black text-xs uppercase flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700">Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-[#141414]" />
                        <span>Copy Text &amp; Deep Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Internal Share to Commuter Buzz */
            <form onSubmit={handleShareToBuzz} className="space-y-4">
              <div className="bg-amber-50 border-2 border-[#141414] p-3 text-xs">
                <span className="font-black text-amber-900 uppercase flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#F27D26]" />
                  Community Verification Feed
                </span>
                <p className="text-stone-700 font-medium">
                  Sharing this fare card to <strong>Commuter Buzz</strong> publishes a live crowdsourced confirmation under your username ({store.getUserHandle()}) so other commuters at the terminus can verify it!
                </p>
              </div>

              {buzzShared ? (
                <div className="p-6 bg-emerald-50 border-2 border-emerald-600 text-center space-y-2">
                  <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6 stroke-[3]" />
                  </div>
                  <h4 className="font-black text-base text-emerald-950 uppercase">
                    Published to Commuter Buzz!
                  </h4>
                  <p className="text-xs font-bold text-emerald-800">
                    +10 Commuter Reputation Points awarded. Redirecting to Buzz...
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-black uppercase text-[#141414] mb-1">
                      Add a Commuter Note / Tip (Optional):
                    </label>
                    <textarea
                      value={internalComment}
                      onChange={(e) => setInternalComment(e.target.value)}
                      placeholder="e.g. Plenty of kombis loading at the bay. Change given in crisp ZiG coins, rank marshal very helpful!"
                      rows={3}
                      className="w-full p-2.5 text-xs font-bold border-2 border-[#141414] bg-[#F5F5F0] focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="p-3 bg-[#F5F5F0] border-2 border-[#141414] text-xs flex items-center justify-between">
                    <div>
                      <p className="font-black text-[#141414] uppercase">
                        {fare?.route_name || 'All Active Routes'}
                      </p>
                      <p className="text-[11px] text-stone-600 font-bold">
                        Fare attached: {fare ? formatCurrency(fare.fare_amount, fare.currency) : 'Current'}
                      </p>
                    </div>
                    <span className="text-[10px] font-black uppercase bg-[#141414] text-white px-2 py-0.5">
                      Verified
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#F27D26] hover:bg-[#d96615] text-white font-black text-xs uppercase tracking-wider border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414] flex items-center justify-center gap-2 cursor-pointer transition"
                  >
                    <Send className="w-4 h-4" />
                    <span>Publish to Commuter Buzz &amp; Reviews</span>
                  </button>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#F5F5F0] border-t-2 border-[#141414] flex items-center justify-between text-[10px] font-black uppercase text-stone-500 shrink-0">
          <span>Encrypted with SHA-256 ID</span>
          <span>Zero-Data Network Compliant</span>
        </div>
      </div>
    </div>
  );
};

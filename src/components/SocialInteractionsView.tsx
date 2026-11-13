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
  PlusCircle, 
  Plus,
  Sparkles, 
  Bus,
  Car,
  Users,
  Truck,
  Bell,
  Send,
  Edit3,
  Trash2,
  Share2,
  CornerDownRight,
  HelpCircle,
  MessageCircle,
  Award,
  AtSign,
  Check,
  X
} from 'lucide-react';
import { useOfflineStore } from '../hooks/useOfflineStore';
import { CommuterNotification, CommuterSocialInteraction, Currency, SocialPostType, SocialTargetType } from '../types';
import { formatTimeAgo, formatCurrency, formatDisplayFare } from '../utils/formatters';
import { AddReviewAbuseModal } from './AddReviewAbuseModal';
import { UserProfileModal } from './UserProfileModal';

interface SocialInteractionsViewProps {
  onSelectRoute?: (routeId: string) => void;
}

function renderCommentWithMentions(text: string): React.ReactNode {
  const parts = text.split(/(@[a-zA-Z0-9_]+)/g);
  return parts.map((part, idx) =>
    part.startsWith('@') && part.length > 1 ? (
      <span
        key={idx}
        className="inline-block bg-[#141414] text-[#F27D26] px-1 py-0.2 mx-0.5 font-black text-[11px]"
      >
        {part}
      </span>
    ) : (
      <React.Fragment key={idx}>{part}</React.Fragment>
    )
  );
}

const POST_TYPE_BADGE: Record<SocialPostType, { label: string; bg: string }> = {
  conversation: { label: 'Conversation', bg: 'bg-blue-100 text-blue-900 border-blue-400' },
  question: { label: 'Question', bg: 'bg-purple-100 text-purple-900 border-purple-400' },
  recommendation: { label: 'Recommendation', bg: 'bg-emerald-100 text-emerald-900 border-emerald-400' },
  review: { label: 'Review', bg: 'bg-amber-100 text-amber-900 border-amber-400' },
  abuse: { label: 'Abuse Alert', bg: 'bg-red-100 text-red-900 border-red-400' },
};

export const SocialInteractionsView: React.FC<SocialInteractionsViewProps> = ({ onSelectRoute }) => {
  const store = useOfflineStore();
  const interactions = store.getAllSocialInteractions();
  const profile = store.getUserProfile();
  const routes = store.getRoutes();
  const ranks = store.getRanks();
  const commuters = store.getCommutersDirectory();
  const notifications = store.getNotifications();
  const unreadCount = store.getUnreadNotificationsCount();
  const displayCurrency = store.getDisplayCurrency();

  const [activeFilter, setActiveFilter] = useState<
    'all' | 'conversations' | 'recommendations' | 'ranks' | 'transporters' | 'commuters' | 'intercity' | 'route' | 'fares' | 'abuse'
  >('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalPresetTarget, setModalPresetTarget] = useState<{
    type: SocialTargetType;
    id: string;
    name: string;
    allowSelection: boolean;
  } | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Notifications drawer & focus state
  const [showNotifications, setShowNotifications] = useState(false);
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null);

  // Quick Inline Interactive Composer state
  const [composerType, setComposerType] = useState<SocialPostType>('conversation');
  const [composerTargetType, setComposerTargetType] = useState<SocialTargetType>('route');
  const [composerTargetId, setComposerTargetId] = useState<string>(routes[0]?.id || 'route-harare-chitungwiza');
  const [composerText, setComposerText] = useState('');
  const [composerRating, setComposerRating] = useState<number>(0);
  const [composerLocationRec, setComposerLocationRec] = useState('');
  const [composerFareRec, setComposerFareRec] = useState('');
  const [composerCurrency, setComposerCurrency] = useState<Currency>('USD');
  const [composerPosted, setComposerPosted] = useState(false);

  // Per-post interactive states (threads, edits, delete confirms, share)
  const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostText, setEditPostText] = useState('');
  const [editPostRating, setEditPostRating] = useState<number | undefined>(undefined);
  const [confirmDeletePostId, setConfirmDeletePostId] = useState<string | null>(null);

  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyText, setEditReplyText] = useState('');
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);

  const openModalForTarget = (type: SocialTargetType, id: string, name: string, allowSelection: boolean) => {
    setModalPresetTarget({ type, id, name, allowSelection });
    setIsAddModalOpen(true);
  };

  const targetOptions = useMemo(() => {
    if (composerTargetType === 'rank') {
      return ranks.map((r) => ({ id: r.id, name: `${r.name} (${r.city})` }));
    }
    if (composerTargetType === 'commuter') {
      return commuters.map((c) => ({ id: c.device_id, name: `${c.username} (${c.handle})` }));
    }
    return routes.map((rt) => ({ id: rt.id, name: `${rt.name} (${rt.city})` }));
  }, [composerTargetType, ranks, commuters, routes]);

  const handleQuickPostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composerText.trim()) return;

    const selectedEntity = targetOptions.find((t) => t.id === composerTargetId) || targetOptions[0];
    const parsedFare = parseFloat(composerFareRec);

    store.addSocialInteraction({
      targetType: composerTargetType,
      targetId: selectedEntity?.id || 'general',
      targetName: selectedEntity?.name || 'Zimbabwe Commuter Corridor',
      postType: composerType,
      comment: composerText.trim(),
      rating: composerRating > 0 ? composerRating : undefined,
      recommendedLocation: composerLocationRec.trim() || undefined,
      confirmedFare:
        !isNaN(parsedFare) && parsedFare > 0
          ? { amount: parsedFare, currency: composerCurrency }
          : undefined,
    });

    setComposerText('');
    setComposerRating(0);
    setComposerLocationRec('');
    setComposerFareRec('');
    setComposerPosted(true);
    setTimeout(() => setComposerPosted(false), 2500);
  };

  const handleSendReply = (e: React.FormEvent, interactionId: string) => {
    e.preventDefault();
    const draft = (replyDrafts[interactionId] || '').trim();
    if (!draft) return;
    store.addSocialReply(interactionId, draft);
    setReplyDrafts((prev) => ({ ...prev, [interactionId]: '' }));
    setExpandedThreads((prev) => ({ ...prev, [interactionId]: true }));
  };

  const handleSharePost = async (item: CommuterSocialInteraction) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const link = `${baseUrl}/?tab=buzz&post=${encodeURIComponent(item.id)}`;
    const text = `Fambai Commuter Buzz (${item.targetName}): "${item.comment}" — by ${item.username} (${item.userHandle}). Join offline-first transit community: ${link}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: `Commuter Buzz: ${item.targetName}`, text, url: link });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedPostId(item.id);
    setTimeout(() => setCopiedPostId(null), 2200);
  };

  const handleNotificationClick = (n: CommuterNotification) => {
    store.markNotificationRead(n.id);
    if (n.postId) {
      setActiveFilter('all');
      setHighlightedPostId(n.postId);
      setExpandedThreads((prev) => ({ ...prev, [n.postId!]: true }));
      const el = document.getElementById(`buzz-post-${n.postId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => setHighlightedPostId(null), 3500);
    }
  };

  // Filtered interactions
  const filteredInteractions = useMemo(() => {
    return interactions.filter((item) => {
      if (activeFilter === 'conversations') return item.postType === 'conversation' || item.postType === 'question';
      if (activeFilter === 'recommendations') return item.postType === 'recommendation' || !!item.recommendedLocation;
      if (activeFilter === 'ranks') return item.targetType === 'rank';
      if (activeFilter === 'transporters') return item.targetType === 'transporter';
      if (activeFilter === 'commuters') return item.targetType === 'commuter';
      if (activeFilter === 'intercity') return item.targetType === 'intercity' || item.targetType === 'operator';
      if (activeFilter === 'route') return item.targetType === 'route';
      if (activeFilter === 'fares') return !!item.confirmedFare;
      if (activeFilter === 'abuse') return !!item.isAbuseReport;
      return true;
    });
  }, [interactions, activeFilter]);

  return (
    <div className="space-y-4">
      {/* Social Banner, Notifications Bell & User Profile Bar */}
      <div className="bg-white border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-[#F27D26] text-white px-2 py-0.5 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Live Commuter Community
              </span>
              <span className="text-xs text-stone-500 font-bold">
                Tag • Reply • Rate • Share
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#141414] uppercase tracking-tight">
              Social Commuter Buzz &amp; Reviews
            </h2>
            <p className="text-xs font-bold text-stone-600 mt-1 max-w-xl">
              Start conversations, ask questions, recommend commuters/fares/locations, @tag fellow travellers, reply in threads, and track notifications.
            </p>
          </div>

          {/* Notifications Bell, User Profile Pill & Full Review Modal */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative p-2 border-2 border-[#141414] text-xs font-black uppercase flex items-center gap-1.5 transition cursor-pointer shadow-[2px_2px_0px_0px_#141414] ${
                showNotifications ? 'bg-[#141414] text-white' : 'bg-[#F5F5F0] text-[#141414] hover:bg-white'
              }`}
              title="View tags, replies, likes, and rating notifications"
            >
              <Bell className={`w-4 h-4 ${unreadCount > 0 ? 'text-red-500' : 'text-[#F27D26]'}`} />
              <span>Alerts</span>
              {unreadCount > 0 && (
                <span className="bg-red-600 text-white px-1.5 py-0.2 text-[10px] font-black border border-white">
                  {unreadCount}
                </span>
              )}
            </button>

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
              onClick={() => openModalForTarget('route', routes[0]?.id || 'route-harare-chitungwiza', routes[0]?.name || 'City Centre ↔ Chitungwiza', true)}
              className="py-2 px-3.5 bg-[#141414] text-white border-2 border-[#141414] shadow-[3px_3px_0px_0px_#F27D26] hover:bg-[#F27D26] hover:text-white transition font-black text-xs uppercase tracking-wider cursor-pointer flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Full Review / Abuse</span>
            </button>
          </div>
        </div>

        {/* Notifications Panel */}
        {showNotifications && (
          <div className="mt-4 p-3.5 bg-[#F5F5F0] border-2 border-[#141414] shadow-[3px_3px_0px_0px_#141414] space-y-2.5">
            <div className="flex items-center justify-between border-b border-stone-300 pb-2">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-red-600" />
                <span className="text-xs font-black uppercase text-[#141414]">
                  Commuter Notifications ({notifications.length})
                </span>
                {unreadCount > 0 && (
                  <span className="bg-red-600 text-white px-1.5 py-0.2 text-[10px] font-black">
                    {unreadCount} Unread
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => store.markAllNotificationsRead()}
                    className="text-[10px] font-black uppercase px-2 py-1 bg-white border border-[#141414] hover:bg-[#141414] hover:text-white cursor-pointer transition"
                  >
                    Mark All Read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowNotifications(false)}
                  className="text-xs font-black px-1.5 py-0.5 border border-[#141414] bg-white cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {notifications.length === 0 ? (
              <p className="text-xs font-bold text-stone-600 py-3 text-center">
                No notifications yet. When commuters @tag you, reply to your posts, like your updates, or rate you, alerts appear here!
              </p>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {notifications.slice(0, 20).map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-2.5 border border-[#141414] flex items-start justify-between gap-2 cursor-pointer transition ${
                      n.read ? 'bg-white text-stone-600' : 'bg-amber-50 border-l-4 border-l-red-600 text-[#141414]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-black uppercase">
                        <span className={`px-1.5 py-0.2 text-white ${
                          n.type === 'tag' ? 'bg-purple-700' : n.type === 'reply' ? 'bg-blue-700' : n.type === 'like' ? 'bg-[#F27D26]' : 'bg-emerald-700'
                        }`}>
                          {n.type}
                        </span>
                        <span>{n.senderUsername} ({n.senderHandle})</span>
                        <span className="text-stone-400">• {formatTimeAgo(n.createdAt)}</span>
                      </div>
                      <p className="text-xs font-bold mt-1">{n.snippet}</p>
                    </div>
                    {!n.read && (
                      <span className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0 mt-1" title="Unread" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick Inline Interactive Composer */}
        <form onSubmit={handleQuickPostSubmit} className="mt-4 p-3.5 bg-[#F5F5F0] border-2 border-[#141414] space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-black uppercase text-[#141414] flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-[#F27D26]" />
              <span>Start a Conversation, Question or Recommendation</span>
            </span>

            <div className="flex flex-wrap gap-1">
              {([
                { id: 'conversation', label: 'Conversation', icon: MessageSquare },
                { id: 'question', label: 'Ask Question', icon: HelpCircle },
                { id: 'recommendation', label: 'Recommend', icon: Award },
                { id: 'review', label: 'Rate / Review', icon: Star },
              ] as { id: SocialPostType; label: string; icon: any }[]).map((mode) => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setComposerType(mode.id)}
                    className={`px-2 py-1 text-[10px] font-black uppercase border border-[#141414] flex items-center gap-1 cursor-pointer transition ${
                      composerType === mode.id
                        ? 'bg-[#141414] text-[#F27D26]'
                        : 'bg-white text-[#141414] hover:bg-stone-100'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select
              value={composerTargetType}
              onChange={(e) => {
                const nt = e.target.value as SocialTargetType;
                setComposerTargetType(nt);
                if (nt === 'rank' && ranks[0]) setComposerTargetId(ranks[0].id);
                else if (nt === 'commuter' && commuters[0]) setComposerTargetId(commuters[0].device_id);
                else if (routes[0]) setComposerTargetId(routes[0].id);
              }}
              className="p-2 bg-white border-2 border-[#141414] text-xs font-black uppercase"
            >
              <option value="route">Topic: Local Route / Corridor</option>
              <option value="rank">Topic: Bus Terminus / Rank</option>
              <option value="commuter">Topic: Commuter / User</option>
            </select>

            <select
              value={composerTargetId}
              onChange={(e) => setComposerTargetId(e.target.value)}
              className="p-2 bg-white border-2 border-[#141414] text-xs font-bold"
            >
              {targetOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.name}</option>
              ))}
            </select>
          </div>

          <textarea
            rows={2}
            value={composerText}
            onChange={(e) => setComposerText(e.target.value)}
            placeholder={
              composerType === 'question'
                ? 'Ask fellow commuters a question (e.g. Are kombis still loading at Copacabana? How much to Chitungwiza in ZAR? @tag someone...)'
                : composerType === 'recommendation'
                ? 'Recommend a reliable commuter, safe rank, clean coach, or fair fare...'
                : 'Start a conversation, share an update, or @tag another commuter...'
            }
            className="w-full p-2.5 bg-white border-2 border-[#141414] text-xs font-bold text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
          />

          {/* Recommendation / Optional Rating & Fare Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              value={composerLocationRec}
              onChange={(e) => setComposerLocationRec(e.target.value)}
              placeholder="Location / Rank tag (Optional)"
              className="p-2 bg-white border border-[#141414] text-xs font-bold"
            />
            <div className="flex gap-1">
              <input
                type="number"
                step="0.5"
                min="0"
                value={composerFareRec}
                onChange={(e) => setComposerFareRec(e.target.value)}
                placeholder="Fare (Opt)"
                className="w-full p-2 bg-white border border-[#141414] text-xs font-bold"
              />
              <select
                value={composerCurrency}
                onChange={(e) => setComposerCurrency(e.target.value as Currency)}
                className="p-2 bg-white border border-[#141414] text-xs font-black"
              >
                <option value="USD">USD</option>
                <option value="ZWG">ZWG</option>
                <option value="ZAR">ZAR</option>
              </select>
            </div>
            <div className="flex items-center justify-between bg-white border border-[#141414] px-2 py-1">
              <span className="text-[10px] font-black uppercase text-stone-500">Rate:</span>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setComposerRating(composerRating === s ? 0 : s)}
                    className="cursor-pointer p-0.5"
                    title={`${s} Star Rating`}
                  >
                    <Star className={`w-4 h-4 ${s <= composerRating ? 'fill-[#F27D26] text-[#141414]' : 'text-stone-300'}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* @Tag Commuters Quick Picker & Submit */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] font-black uppercase text-stone-500 flex items-center gap-0.5">
                <AtSign className="w-3 h-3 text-[#F27D26]" /> Tag:
              </span>
              {commuters.slice(0, 5).map((c) => (
                <button
                  key={c.device_id}
                  type="button"
                  onClick={() => setComposerText((prev) => `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}${c.handle} `)}
                  className="px-1.5 py-0.5 bg-white hover:bg-[#141414] hover:text-[#F27D26] border border-[#141414] text-[10px] font-black cursor-pointer transition"
                >
                  {c.handle}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {composerPosted && (
                <span className="text-[10px] font-black uppercase text-emerald-700 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Posted &amp; Synced!
                </span>
              )}
              <button
                type="submit"
                disabled={!composerText.trim()}
                className="px-4 py-2 bg-[#F27D26] hover:bg-[#141414] text-white text-xs font-black uppercase tracking-wider border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414] flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Post to Buzz</span>
              </button>
            </div>
          </div>
        </form>

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
            onClick={() => setActiveFilter('conversations')}
            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-[#141414] transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeFilter === 'conversations'
                ? 'bg-[#141414] text-white shadow-[2px_2px_0px_0px_#F27D26]'
                : 'bg-white text-stone-700 hover:bg-stone-100'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#F27D26]" />
            <span>Q&amp;A / Chats</span>
          </button>

          <button
            onClick={() => setActiveFilter('recommendations')}
            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-[#141414] transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeFilter === 'recommendations'
                ? 'bg-[#141414] text-white shadow-[2px_2px_0px_0px_#F27D26]'
                : 'bg-white text-stone-700 hover:bg-stone-100'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-[#F27D26]" />
            <span>Recommendations</span>
          </button>

          <button
            onClick={() => setActiveFilter('ranks')}
            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-[#141414] transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeFilter === 'ranks'
                ? 'bg-[#141414] text-white shadow-[2px_2px_0px_0px_#F27D26]'
                : 'bg-white text-stone-700 hover:bg-stone-100'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-[#F27D26]" />
            <span>Termini &amp; Ranks</span>
          </button>

          <button
            onClick={() => setActiveFilter('transporters')}
            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-[#141414] transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeFilter === 'transporters'
                ? 'bg-[#141414] text-white shadow-[2px_2px_0px_0px_#F27D26]'
                : 'bg-white text-stone-700 hover:bg-stone-100'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-[#F27D26]" />
            <span>Transporters</span>
          </button>

          <button
            onClick={() => setActiveFilter('commuters')}
            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-[#141414] transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeFilter === 'commuters'
                ? 'bg-[#141414] text-white shadow-[2px_2px_0px_0px_#F27D26]'
                : 'bg-white text-stone-700 hover:bg-stone-100'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-[#F27D26]" />
            <span>Commuters &amp; Users ({commuters.length})</span>
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
            <span>Abuse Alerts ({interactions.filter(i => i.isAbuseReport).length})</span>
          </button>
        </div>
      </div>

      {/* Commuters & Users Directory */}
      {(activeFilter === 'commuters' || activeFilter === 'all') && commuters.length > 0 && (
        <div className="bg-white border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414] p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#F27D26]">Synced Community</span>
              <h3 className="text-sm font-black uppercase text-[#141414] flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#F27D26]" />
                <span>Commuters &amp; Users ({commuters.length})</span>
              </h3>
            </div>
            <span className="text-[10px] font-bold text-stone-500 uppercase">Rate, tag or endorse peers</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {commuters.slice(0, activeFilter === 'commuters' ? 30 : 4).map((c) => {
              const ratingSummary = store.getRatingSummaryForTarget('commuter', c.device_id);
              const isSelf = c.device_id === profile.device_id;
              return (
                <div
                  key={c.device_id}
                  className="p-3 bg-[#F5F5F0] border-2 border-[#141414] flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-8 h-8 flex items-center justify-center font-black text-white text-xs border-2 border-[#141414] shrink-0"
                      style={{ backgroundColor: c.avatarColor || '#F27D26' }}
                    >
                      {(c.username || 'C').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-[#141414] truncate">{c.username}</span>
                        {isSelf && (
                          <span className="text-[9px] font-black uppercase px-1 bg-[#141414] text-[#F27D26]">You</span>
                        )}
                        <span className="text-[10px] font-bold text-stone-500">{c.handle}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-stone-600 mt-0.5 flex-wrap">
                        <span className="uppercase text-[9px] bg-white px-1.5 border border-[#141414]">{c.commuterBadge}</span>
                        {ratingSummary.count > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[#141414] font-black">
                            <Star className="w-3 h-3 fill-[#F27D26] text-[#F27D26]" />
                            {ratingSummary.avg} ({ratingSummary.count})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setComposerText((prev) => `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}${c.handle} `)}
                      className="px-2 py-1.5 bg-white hover:bg-[#141414] hover:text-[#F27D26] text-[#141414] text-[10px] font-black uppercase border border-[#141414] cursor-pointer transition"
                      title={`Tag ${c.handle} in composer`}
                    >
                      @Tag
                    </button>
                    <button
                      type="button"
                      onClick={() => openModalForTarget('commuter', c.device_id, `${c.username} (${c.handle})`, false)}
                      className="px-2.5 py-1.5 bg-[#141414] hover:bg-[#F27D26] text-white text-[10px] font-black uppercase border border-[#141414] cursor-pointer transition"
                    >
                      Rate
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
                  ? 'Nothing has been created yet! Start a conversation, ask a route question, recommend a commuter or safe rank, or tag fellow travellers using the composer above.' 
                  : 'Nothing has been posted under this filter yet. Be the first to share an update here or reset your filter to view all discussions.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => openModalForTarget('route', routes[0]?.id || 'route-harare-chitungwiza', routes[0]?.name || 'City Centre ↔ Chitungwiza', true)}
                className="py-3 px-6 bg-[#141414] text-white hover:bg-[#F27D26] transition font-black text-xs sm:text-sm uppercase tracking-wider border-2 border-[#141414] shadow-[4px_4px_0px_0px_#F27D26] flex items-center gap-2 cursor-pointer"
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
            const isOwner = store.isOwnerOf(item.ownerUid, item.deviceId);
            const replies = store.getRepliesForInteraction(item.id);
            const isThreadExpanded = !!expandedThreads[item.id] || replies.length > 0;
            const postBadge = POST_TYPE_BADGE[item.postType || (isAbuse ? 'abuse' : 'review')];
            const isEditingThis = editingPostId === item.id;

            return (
              <div 
                id={`buzz-post-${item.id}`}
                key={item.id}
                className={`bg-white border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414] p-4 transition ${
                  isAbuse ? 'border-l-8 border-l-[#EF4444]' : ''
                } ${highlightedPostId === item.id ? 'ring-4 ring-[#F27D26]' : ''}`}
              >
                {/* User & Target Header */}
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
                        <span className={`px-1.5 py-0.2 text-[8px] font-black uppercase border ${postBadge.bg}`}>
                          {postBadge.label}
                        </span>
                      </div>
                      <div className="text-[10px] text-stone-500 font-bold flex items-center gap-1 flex-wrap mt-0.5">
                        <span className="px-1.5 py-0.2 bg-[#F5F5F0] border border-stone-300 text-[9px] font-black uppercase text-[#141414]">
                          {item.targetType}
                        </span>
                        <span>on</span>
                        {item.targetType === 'route' && onSelectRoute ? (
                          <button
                            type="button"
                            onClick={() => onSelectRoute(item.targetId)}
                            className="text-[#141414] hover:text-[#F27D26] font-black underline uppercase cursor-pointer"
                          >
                            {item.targetName}
                          </button>
                        ) : (
                          <span className="text-[#141414] font-black underline uppercase">{item.targetName}</span>
                        )}
                        <span>•</span>
                        <span>{formatTimeAgo(item.createdAt)}</span>
                        {item.updatedAt && <span className="italic text-stone-400">(edited)</span>}
                      </div>
                    </div>
                  </div>

                  {/* Rating Stars, Abuse Pill & Owner Edit/Delete Controls */}
                  <div className="flex items-center gap-2 flex-wrap justify-end">
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

                    {isOwner && !isEditingThis && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPostId(item.id);
                            setEditPostText(item.comment);
                            setEditPostRating(item.rating);
                          }}
                          className="p-1 bg-[#F5F5F0] hover:bg-[#141414] hover:text-white border border-[#141414] cursor-pointer transition"
                          title="Edit your post (Owner only)"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        {confirmDeletePostId === item.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                store.deleteSocialInteraction(item.id);
                                setConfirmDeletePostId(null);
                              }}
                              className="px-1.5 py-0.5 bg-red-600 text-white text-[9px] font-black uppercase border border-[#141414] cursor-pointer"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeletePostId(null)}
                              className="px-1.5 py-0.5 bg-white text-[#141414] text-[9px] font-black uppercase border border-[#141414] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeletePostId(item.id)}
                            className="p-1 bg-red-50 hover:bg-red-600 hover:text-white text-red-700 border border-[#141414] cursor-pointer transition"
                            title="Delete your post (Owner only)"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Comment Content OR Owner Inline Edit Mode */}
                {isEditingThis ? (
                  <div className="my-2 p-2.5 bg-[#F5F5F0] border-2 border-[#141414] space-y-2">
                    <textarea
                      rows={3}
                      value={editPostText}
                      onChange={(e) => setEditPostText(e.target.value)}
                      className="w-full p-2 bg-white border border-[#141414] text-xs font-bold"
                    />
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-black uppercase">Rating:</span>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setEditPostRating(s)}
                            className="cursor-pointer"
                          >
                            <Star className={`w-4 h-4 ${s <= (editPostRating || 0) ? 'fill-[#F27D26] text-[#141414]' : 'text-stone-300'}`} />
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            store.updateSocialInteraction(item.id, { comment: editPostText, rating: editPostRating });
                            setEditingPostId(null);
                          }}
                          className="px-2.5 py-1 bg-[#141414] text-white text-[10px] font-black uppercase border border-[#141414] cursor-pointer"
                        >
                          Save Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPostId(null)}
                          className="px-2.5 py-1 bg-white text-[#141414] text-[10px] font-black uppercase border border-[#141414] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs font-bold text-stone-800 leading-relaxed my-2">
                    {renderCommentWithMentions(item.comment)}
                  </p>
                )}

                {/* Recommended Location Highlight */}
                {item.recommendedLocation && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-300 text-amber-950 text-[10px] font-black uppercase mr-2 mb-2">
                    <MapPin className="w-3 h-3 text-[#F27D26]" />
                    <span>Recommended Location: {item.recommendedLocation}</span>
                  </div>
                )}

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
                      <span>
                        Confirmed Fare: {formatDisplayFare(item.confirmedFare.amount, item.confirmedFare.currency, displayCurrency)}
                        {item.confirmedFare.currency !== displayCurrency && ` (${formatCurrency(item.confirmedFare.amount, item.confirmedFare.currency)})`}
                      </span>
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

                {/* Social Actions: Like, Dislike, Reply, Share */}
                <div className="flex items-center justify-between pt-2 border-t border-stone-100 flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
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

                    <button
                      type="button"
                      onClick={() => setExpandedThreads((prev) => ({ ...prev, [item.id]: !isThreadExpanded }))}
                      className="px-2.5 py-1 text-xs font-black uppercase border border-[#141414] bg-[#F5F5F0] hover:bg-[#141414] hover:text-white text-[#141414] transition cursor-pointer flex items-center gap-1"
                    >
                      <CornerDownRight className="w-3.5 h-3.5 text-[#F27D26]" />
                      <span>Reply ({replies.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSharePost(item)}
                      className="px-2.5 py-1 text-xs font-black uppercase border border-[#141414] bg-white hover:bg-[#F27D26] hover:text-white text-[#141414] transition cursor-pointer flex items-center gap-1"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>{copiedPostId === item.id ? 'Copied!' : 'Share'}</span>
                    </button>
                  </div>

                  <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                    {isOwner ? 'Your Post (Owner)' : 'Synced Commuter'}
                  </span>
                </div>

                {/* Threaded Replies & Reply Composer */}
                {isThreadExpanded && (
                  <div className="mt-3 pl-3 sm:pl-4 border-l-4 border-[#F27D26] space-y-2">
                    {replies.map((reply) => {
                      const isReplyOwner = store.isOwnerOf(reply.ownerUid, reply.deviceId);
                      const isEditingReply = editingReplyId === reply.id;
                      return (
                        <div key={reply.id} className="p-2.5 bg-[#F5F5F0] border border-[#141414] text-xs space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className="w-5 h-5 text-[9px] font-black text-white flex items-center justify-center border border-[#141414]"
                                style={{ backgroundColor: reply.avatarBg || '#F27D26' }}
                              >
                                {reply.username.charAt(0).toUpperCase()}
                              </span>
                              <span className="font-black text-[#141414]">{reply.username}</span>
                              <span className="text-[10px] text-stone-500 font-bold">{reply.userHandle}</span>
                              <span className="text-[10px] text-stone-400">• {formatTimeAgo(reply.createdAt)}</span>
                              {reply.updatedAt && <span className="text-[9px] italic text-stone-400">(edited)</span>}
                            </div>
                            {isReplyOwner && !isEditingReply && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingReplyId(reply.id);
                                    setEditReplyText(reply.comment);
                                  }}
                                  className="p-0.5 bg-white border border-[#141414] cursor-pointer"
                                  title="Edit reply"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => store.deleteSocialReply(reply.id)}
                                  className="p-0.5 bg-red-50 text-red-700 border border-[#141414] cursor-pointer"
                                  title="Delete reply"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>

                          {isEditingReply ? (
                            <div className="flex gap-1.5 pt-1">
                              <input
                                type="text"
                                value={editReplyText}
                                onChange={(e) => setEditReplyText(e.target.value)}
                                className="flex-1 p-1.5 bg-white border border-[#141414] text-xs font-bold"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  store.updateSocialReply(reply.id, editReplyText);
                                  setEditingReplyId(null);
                                }}
                                className="px-2 py-1 bg-[#141414] text-white text-[10px] font-black uppercase cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingReplyId(null)}
                                className="px-2 py-1 bg-white border border-[#141414] text-[10px] font-black uppercase cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <p className="font-bold text-stone-800">{renderCommentWithMentions(reply.comment)}</p>
                          )}
                        </div>
                      );
                    })}

                    <form onSubmit={(e) => handleSendReply(e, item.id)} className="flex flex-col gap-1.5">
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={replyDrafts[item.id] ?? ''}
                          onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          placeholder={`Reply to ${item.userHandle} (use @handle to tag)...`}
                          className="flex-1 p-2 bg-white border-2 border-[#141414] text-xs font-bold focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={!(replyDrafts[item.id] || '').trim()}
                          className="px-3 py-2 bg-[#141414] hover:bg-[#F27D26] text-white text-[10px] font-black uppercase border-2 border-[#141414] cursor-pointer disabled:opacity-50 flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" />
                          <span>Send</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        <button
                          type="button"
                          onClick={() =>
                            setReplyDrafts((prev) => ({
                              ...prev,
                              [item.id]: `${prev[item.id] || ''}${item.userHandle} `,
                            }))
                          }
                          className="px-1.5 py-0.5 bg-[#F5F5F0] hover:bg-[#141414] hover:text-[#F27D26] border border-[#141414] text-[9px] font-black cursor-pointer"
                        >
                          Tag {item.userHandle}
                        </button>
                        {commuters.slice(0, 3).map((c) => (
                          c.handle !== item.userHandle && (
                            <button
                              key={c.device_id}
                              type="button"
                              onClick={() =>
                                setReplyDrafts((prev) => ({
                                  ...prev,
                                  [item.id]: `${prev[item.id] || ''}${c.handle} `,
                                }))
                              }
                              className="px-1.5 py-0.5 bg-white hover:bg-[#141414] hover:text-[#F27D26] border border-[#141414] text-[9px] font-black cursor-pointer"
                            >
                              {c.handle}
                            </button>
                          )
                        ))}
                      </div>
                    </form>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Global Add Review/Abuse Modal */}
      {isAddModalOpen && (
        <AddReviewAbuseModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setModalPresetTarget(null);
          }}
          targetType={modalPresetTarget?.type || 'route'}
          targetId={modalPresetTarget?.id || routes[0]?.id || 'route-harare-chitungwiza'}
          targetName={modalPresetTarget?.name || routes[0]?.name || 'City Centre ↔ Chitungwiza'}
          allowTargetSelection={modalPresetTarget ? modalPresetTarget.allowSelection : true}
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

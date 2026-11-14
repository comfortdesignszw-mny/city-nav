import React from 'react';
import {
  ShieldCheck,
  FileText,
  Lock,
  DollarSign,
  Moon,
  Users,
  X,
} from 'lucide-react';

export type LegalDocTab = 'terms' | 'privacy';

interface LegalDocsModalProps {
  isOpen: boolean;
  activeDoc: LegalDocTab;
  onChangeDoc: (tab: LegalDocTab) => void;
  onClose: () => void;
}

export const LegalDocsModal: React.FC<LegalDocsModalProps> = ({
  isOpen,
  activeDoc,
  onChangeDoc,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#141414]/80 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
    >
      <div className="bg-[#F5F5F0] text-[#141414] border-2 border-[#141414] shadow-[8px_8px_0px_0px_#F27D26] w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-[#141414] text-white px-4 py-3.5 border-b-2 border-[#141414] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {activeDoc === 'terms' ? (
              <FileText className="w-5 h-5 text-[#F27D26] flex-shrink-0" />
            ) : (
              <Lock className="w-5 h-5 text-[#F27D26] flex-shrink-0" />
            )}
            <div>
              <h2 id="legal-modal-title" className="text-sm sm:text-base font-black uppercase tracking-tight">
                Fambai / Hambani Legal Documentation
              </h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-300">
                Effective Date: November 2026 • Zimbabwe Commuter Network
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 bg-stone-800 hover:bg-[#F27D26] text-white border border-stone-600 transition cursor-pointer"
            aria-label="Close legal documentation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Document Switcher Tabs */}
        <div className="grid grid-cols-2 border-b-2 border-[#141414] bg-white">
          <button
            type="button"
            onClick={() => onChangeDoc('terms')}
            className={`py-2.5 px-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 border-r-2 border-[#141414] transition cursor-pointer ${
              activeDoc === 'terms'
                ? 'bg-[#F27D26] text-white'
                : 'bg-white text-[#141414] hover:bg-[#F5F5F0]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Terms of Use</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeDoc('privacy')}
            className={`py-2.5 px-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer ${
              activeDoc === 'privacy'
                ? 'bg-[#F27D26] text-white'
                : 'bg-white text-[#141414] hover:bg-[#F5F5F0]'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Privacy Policy</span>
          </button>
        </div>

        {/* Scrollable Document Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm leading-relaxed">
          {activeDoc === 'terms' ? (
            <>
              {/* CRITICAL FARE DISCLAIMER CALLOUT */}
              <div className="bg-amber-50 border-2 border-[#141414] shadow-[3px_3px_0px_0px_#141414] p-3.5 sm:p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-[#141414] font-black uppercase text-xs tracking-wider">
                  <DollarSign className="w-4 h-4 text-[#F27D26] flex-shrink-0" />
                  <span>Important Fare &amp; Pricing Disclaimer</span>
                </div>
                <p className="text-xs font-semibold text-[#141414]">
                  All transit fares displayed in this app (in USD, ZWG, or ZAR) are crowdsourced community estimates only.{' '}
                  <strong>
                    This app does not publish standardised fare costs, nor can any listed amount be treated as an
                    authentic, fixed, or binding fare charge for all operators.
                  </strong>{' '}
                  Commuters must always verify the exact particular fare directly with the operators, drivers, or
                  conductors of the Kombis, Intercity Coaches, or Taxis they intend to board before commencing a trip.
                </p>
              </div>

              {/* CRITICAL NIGHT TRAVEL & PRIVATE TAXI SAFETY CALLOUT */}
              <div className="bg-rose-50 border-2 border-[#141414] shadow-[3px_3px_0px_0px_#141414] p-3.5 sm:p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-rose-950 font-black uppercase text-xs tracking-wider">
                  <Moon className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>Commuter Safety: Private Taxis &amp; Night Travel</span>
                </div>
                <p className="text-xs font-semibold text-rose-950">
                  When boarding <strong>private taxis</strong> (including unregistered vehicles or private hires) or
                  travelling <strong>during the night</strong>, commuters must exercise extra caution:{' '}
                  <strong>
                    do not ride alone or travel with unknown drivers or unfamiliar commuters, and always share your trip
                    details
                  </strong>{' '}
                  (vehicle registration plate, route, rank/pickup location, operator details, and expected arrival time)
                  with trusted family members or loved ones for your personal safety.
                </p>
              </div>

              <section className="bg-white border-2 border-[#141414] p-4 space-y-3">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider border-b-2 border-[#141414] pb-1.5">
                  1. Acceptance of Terms &amp; Platform Purpose
                </h3>
                <p className="text-xs text-stone-700 font-medium">
                  By accessing or using <strong>Fambai / Hambani Travel</strong> ("the App"), you agree to be bound by
                  these Terms of Use and our Privacy Policy. The App is an offline-first, community-powered commuter
                  information network designed to help travellers across Zimbabwe share and view indicative kombi, taxi,
                  and intercity coach fares, rank locations, road status alerts, boarding confirmations, and commuter
                  feedback.
                </p>
              </section>

              <section className="bg-white border-2 border-[#141414] p-4 space-y-3">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider border-b-2 border-[#141414] pb-1.5">
                  2. No Official Pricing, Licensing, or Endorsement
                </h3>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-stone-700 font-medium">
                  <li>
                    <strong>Fare Verification Required:</strong> Reported fares vary significantly due to peak-hour
                    demand, weather, road conditions, fuel availability, operator pricing, and exchange-rate shifts
                    between USD, ZWG, and ZAR. Always confirm the fare verbally or via official ticket receipt with the
                    Kombi, Coach, or Taxi operator before boarding.
                  </li>
                  <li>
                    <strong>Independent Operators:</strong> Transporters, kombis, taxis, and coach companies listed in
                    the directory are independent third parties. A listing, badge, or community rating on this App does
                    not constitute regulatory licensing, insurance verification, mechanical inspection, or safety
                    endorsement by Fambai / Hambani Travel.
                  </li>
                  <li>
                    <strong>Safety Responsibility:</strong> You are solely responsible for assessing the safety of any
                    vehicle, rank, route, driver, or co-passenger. Exercise heightened vigilance at night and when using
                    private taxis—avoid riding alone with strangers and keep loved ones informed of your live trip
                    details.
                  </li>
                </ul>
              </section>

              <section className="bg-white border-2 border-[#141414] p-4 space-y-3">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider border-b-2 border-[#141414] pb-1.5">
                  3. User Contributions, Accounts &amp; Conduct
                </h3>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-stone-700 font-medium">
                  <li>
                    <strong>Crowdsourced Integrity:</strong> Whether participating via a Guest ID (e.g.,{' '}
                    <code>guest_XXXXX</code>) or a verified Google account, you agree to submit truthful, good-faith
                    fare reports, boarding confirmations, road statuses, and reviews.
                  </li>
                  <li>
                    <strong>Prohibited Content:</strong> Do not post false roadblocks, deliberately misleading fares,
                    harassment, hate speech, defamatory accusations, spam, or another person&apos;s private personal
                    contact details without consent.
                  </li>
                  <li>
                    <strong>Ownership &amp; License:</strong> You retain ownership controls (edit/delete rights) over
                    your own submissions while authenticated. By publishing transit updates, reviews, or rank check-ins,
                    you grant the community a non-exclusive license to view and rely on that crowdsourced data across
                    offline and online sessions.
                  </li>
                </ul>
              </section>

              <section className="bg-white border-2 border-[#141414] p-4 space-y-3">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider border-b-2 border-[#141414] pb-1.5">
                  4. Offline Operation &amp; Limitation of Liability
                </h3>
                <p className="text-xs text-stone-700 font-medium">
                  The App uses local SQLite/device storage to operate offline and automatically syncs queued entries to
                  Cloud Firestore when connectivity resumes. The App is provided <strong>"AS IS"</strong> and{' '}
                  <strong>"AS AVAILABLE"</strong> without warranties of uninterrupted availability, real-time accuracy,
                  or completeness. To the maximum extent permitted by law, Fambai / Hambani Travel and its contributors
                  shall not be liable for fare disputes, missed departures, route delays, property loss, personal injury,
                  or any indirect damages arising from reliance on crowdsourced information.
                </p>
              </section>
            </>
          ) : (
            <>
              <div className="bg-emerald-50 border-2 border-[#141414] shadow-[3px_3px_0px_0px_#141414] p-3.5 sm:p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-950 font-black uppercase text-xs tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                  <span>Privacy-First, Offline-Ready Architecture</span>
                </div>
                <p className="text-xs font-semibold text-emerald-950">
                  We minimize personal data collection. You can contribute anonymously using a random Guest ID (
                  <code>guest_XXXXX</code>), and private details such as your personal phone number or Google email
                  address are isolated behind strict owner-only access rules.
                </p>
              </div>

              <section className="bg-white border-2 border-[#141414] p-4 space-y-3">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider border-b-2 border-[#141414] pb-1.5">
                  1. Information We Collect &amp; Process
                </h3>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-stone-700 font-medium">
                  <li>
                    <strong>Device &amp; Guest Identity:</strong> An application-generated Device ID and random Guest
                    username (e.g., <code>guest_FxD12</code>) paired with a Firebase Anonymous UID to enforce owner-only
                    edit/delete security rules.
                  </li>
                  <li>
                    <strong>Google Account Information (Optional):</strong> If you choose to sign in with Google, we
                    process your verified email address, display name, and Firebase UID strictly to authenticate your
                    session, prevent duplicate accounts, and restore your existing profile and submissions if you sign
                    back in later. Your Google email is <strong>never</strong> shared publicly with other commuters.
                  </li>
                  <li>
                    <strong>Profile &amp; Optional Private Phone:</strong> Username, @handle, commuter badge, avatar
                    color, and optional display name are visible with your public posts. If you add a personal phone
                    number in Profile, it is stored exclusively in an owner-only private record and hidden from all
                    other users. (Note: Business contact numbers voluntarily submitted under the public Transporters
                    Directory are intentionally public so commuters can contact operators.)
                  </li>
                  <li>
                    <strong>Crowdsourced Contributions &amp; Location Tags:</strong> Fare reports, route additions, road
                    status alerts, boarding confirmations ("I boarded here"), Commuter Buzz posts/replies/reactions, and
                    optional GPS or preset location anchors used to identify nearby ranks.
                  </li>
                </ul>
              </section>

              <section className="bg-white border-2 border-[#141414] p-4 space-y-3">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider border-b-2 border-[#141414] pb-1.5">
                  2. Local SQLite Storage &amp; Cloud Synchronization
                </h3>
                <p className="text-xs text-stone-700 font-medium">
                  To support zero-connectivity cold starts, the App stores transit directories, your profile, outbox
                  queue, and preferences locally in your browser via SQLite WASM and Local Storage. When an internet
                  connection is active, queued contributions and profile updates synchronize two-way with Google
                  Firebase (Cloud Firestore &amp; Firebase Authentication) so fellow commuters across devices see live
                  updates.
                </p>
              </section>

              <section className="bg-white border-2 border-[#141414] p-4 space-y-3">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider border-b-2 border-[#141414] pb-1.5">
                  3. Location Permissions &amp; Safety Sharing
                </h3>
                <p className="text-xs text-stone-700 font-medium">
                  GPS geolocation is requested only when you use location features (such as finding the nearest rank or
                  updating your location anchor). You may decline browser location access at any time and choose manual
                  or preset rank locations instead. Remember to share your trip details directly with trusted loved ones
                  using your preferred messaging or phone channels when travelling at night or in private taxis.
                </p>
              </section>

              <section className="bg-white border-2 border-[#141414] p-4 space-y-3">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider border-b-2 border-[#141414] pb-1.5">
                  4. Your Controls, Sign Out &amp; Data Deletion
                </h3>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-stone-700 font-medium">
                  <li>
                    <strong>Edit or Delete Contributions:</strong> While signed in (as Guest or Google user), only you can
                    modify or delete your own fare reports, road alerts, transporter listings, Commuter Buzz posts, or
                    replies.
                  </li>
                  <li>
                    <strong>Sign Out Cleanup:</strong> Tapping <strong>Sign Out</strong> removes your personal profile
                    data (name, username, handle, private phone number, notifications, and device-linked &quot;My
                    Submissions&quot; list) from the device and deletes your active commuter profile and location anchor
                    from the cloud, while preserving community fare/route/buzz records for public transit visibility.
                  </li>
                  <li>
                    <strong>Returning Google Users:</strong> If you previously signed in with Google and later sign back
                    in with the same verified email, your prior profile identity and submissions are securely matched and
                    restored without creating a duplicate account.
                  </li>
                </ul>
              </section>
            </>
          )}
        </div>

        {/* Footer Controls */}
        <div className="bg-white px-4 py-3 border-t-2 border-[#141414] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] font-bold text-stone-600">
            <Users className="w-3.5 h-3.5 text-[#F27D26]" />
            <span>
              {activeDoc === 'terms'
                ? 'Always verify fares with operators & share night/taxi trips.'
                : 'Private PII & Google emails stay strictly owner-protected.'}
            </span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => onChangeDoc(activeDoc === 'terms' ? 'privacy' : 'terms')}
              className="px-3 py-1.5 bg-[#F5F5F0] hover:bg-[#141414] hover:text-white text-[#141414] text-xs font-black uppercase border-2 border-[#141414] transition cursor-pointer"
            >
              {activeDoc === 'terms' ? 'Read Privacy Policy →' : '← Read Terms of Use'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-[#141414] hover:bg-[#F27D26] text-white text-xs font-black uppercase border-2 border-[#141414] shadow-[2px_2px_0px_0px_#F27D26] transition cursor-pointer"
            >
              I Understand
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

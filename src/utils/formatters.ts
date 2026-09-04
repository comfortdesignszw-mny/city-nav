import { StatusType, Currency } from '../types';

export function formatTimeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 45) return 'just now';
  
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}d ago`;
}

export function formatCurrency(amount: number, currency: Currency): string {
  switch (currency) {
    case 'USD':
      return `$${amount.toFixed(2)}`;
    case 'ZAR':
      return `R${Math.round(amount) === amount ? amount : amount.toFixed(1)}`;
    case 'BWP':
      return `P${Math.round(amount) === amount ? amount : amount.toFixed(1)}`;
    case 'ZWL':
    default:
      return `ZiG ${Math.round(amount)}`;
  }
}

export function getCurrencyMeta(currency: Currency): { symbol: string; name: string; regionNote: string } {
  switch (currency) {
    case 'USD':
      return { symbol: '$', name: 'US Dollar (USD)', regionNote: 'Standard nationwide cash fare' };
    case 'ZAR':
      return { symbol: 'R', name: 'SA Rand (ZAR)', regionNote: 'Widely used in Bulawayo, Gwanda & Beitbridge' };
    case 'BWP':
      return { symbol: 'P', name: 'Botswana Pula (BWP)', regionNote: 'Common in Plumtree, border & Mat South corridors' };
    case 'ZWL':
      return { symbol: 'ZiG', name: 'Zimbabwe Gold (ZiG)', regionNote: 'Official local currency' };
  }
}

export interface StatusConfig {
  label: string;
  badgeClass: string;
  bgLight: string;
  textColor: string;
  borderColor: string;
  iconName: string;
  description: string;
}

export function getStatusConfig(type: StatusType): StatusConfig {
  switch (type) {
    case 'running':
      return {
        label: 'Running Normally',
        badgeClass: 'bg-white text-[#141414] border-2 border-[#141414] font-black',
        bgLight: 'bg-[#F5F5F0]',
        textColor: 'text-[#141414]',
        borderColor: 'border-2 border-[#141414]',
        iconName: 'CheckCircle2',
        description: 'Vehicles loading normally, smooth flow',
      };
    case 'delayed':
      return {
        label: 'Delayed / Queues',
        badgeClass: 'bg-[#F27D26] text-white border-2 border-[#141414] font-black',
        bgLight: 'bg-amber-50',
        textColor: 'text-amber-950',
        borderColor: 'border-2 border-[#141414]',
        iconName: 'Clock',
        description: 'Long queues or slow loading at rank',
      };
    case 'diverted':
      return {
        label: 'Diverted Route',
        badgeClass: 'bg-[#141414] text-white border-2 border-[#141414] font-black',
        bgLight: 'bg-stone-100',
        textColor: 'text-[#141414]',
        borderColor: 'border-2 border-[#141414]',
        iconName: 'Navigation',
        description: 'Detour in place / alternative route taken',
      };
    case 'police_blitz':
      return {
        label: 'Police Blitz / Alert',
        badgeClass: 'bg-rose-600 text-white border-2 border-[#141414] font-black shadow-[2px_2px_0px_0px_#141414]',
        bgLight: 'bg-rose-50',
        textColor: 'text-rose-950',
        borderColor: 'border-2 border-[#141414]',
        iconName: 'ShieldAlert',
        description: 'Heavy enforcement / roadblocks reported',
      };
    case 'fuel_shortage':
      return {
        label: 'Fuel Shortage',
        badgeClass: 'bg-amber-400 text-[#141414] border-2 border-[#141414] font-black',
        bgLight: 'bg-amber-50',
        textColor: 'text-[#141414]',
        borderColor: 'border-2 border-[#141414]',
        iconName: 'Fuel',
        description: 'Fewer vehicles running due to fuel queues',
      };
    default:
      return {
        label: 'Unknown',
        badgeClass: 'bg-white text-[#141414] border-2 border-[#141414] font-bold',
        bgLight: 'bg-[#F5F5F0]',
        textColor: 'text-[#141414]',
        borderColor: 'border-2 border-[#141414]',
        iconName: 'Info',
        description: 'Status not reported',
      };
  }
}

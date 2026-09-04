import { StatusType } from '../types';

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

export function formatCurrency(amount: number, currency: 'USD' | 'ZWL'): string {
  if (currency === 'USD') {
    return `$${amount.toFixed(2)}`;
  }
  return `ZiG ${Math.round(amount)}`;
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

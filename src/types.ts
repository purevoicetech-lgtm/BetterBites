
export enum UserTier {
  FREE = 'Free',
  ESSENTIAL = 'Essential',
  PREMIUM = 'Premium'
}

export interface HealthPoint {
  title: string;
  detail: string;
}

export interface HealthAnalysis {
  productName: string;
  score: number;
  explanation: string;
  pros: (string | HealthPoint)[];
  cons: (string | HealthPoint)[];
  additives: string[];
  alternatives?: string[];
}

export interface ComparisonAnalysis {
  products: HealthAnalysis[];
  winner: string;
  comparisonSummary: string;
}

export interface ScanResult {
  id: string;
  originalImages: string[];
  analysis: HealthAnalysis;
  timestamp: number;
}

export interface UserState {
  isLoggedIn: boolean;
  isPaid: boolean;
  tier: UserTier;
  scansRemaining: number;
  history: ScanResult[];
}

export const TIER_CONFIG = {
  [UserTier.FREE]: { price: 0, scans: 10, label: 'Free Trial', stripeLink: null },
  [UserTier.ESSENTIAL]: { price: 9, scans: 50, label: 'Essential', stripeLink: '' },
  [UserTier.PREMIUM]: { price: 19, scans: -1, label: 'Premium (Unlimited)', stripeLink: '' }
};

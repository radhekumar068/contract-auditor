export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt?: string | null;
  lastLoginAt?: string | null;
  countryCode: string;
  preferredCurrency: string;
  phoneNumber?: string | null;
}

export interface Profile {
  email: string;
  fullName: string;
  role: UserRole;
  createdAt: string | null;
  lastLoginAt: string | null;
  activeDeviceCount: number;
  countryCode: string;
  preferredCurrency: string;
  phoneNumber?: string | null;
}

export interface UpdateProfileResponse {
  profile: Profile;
  accessToken: string;
  tokenType: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  user: User;
}

export type SubscriptionStatus = 'ACTIVE' | 'TRIAL' | 'PENDING_CANCEL' | 'CANCELLED' | 'EXPIRED';
export type CommitmentType = 'SUBSCRIPTION' | 'INSURANCE' | 'WARRANTY' | 'UTILITY' | 'MEMBERSHIP' | 'SOFTWARE';
export type BillingFrequency = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL' | 'ONE_TIME';
export type NotificationEventType = 'TRIAL_END' | 'RENEWAL_LOCK' | 'WARRANTY_EXPIRY' | 'CONTRACT_END' | 'RENEWAL_UPCOMING';
export type UrgencyLevel = 'RED' | 'YELLOW' | 'GREEN';

export interface ContractTerm {
  id: number;
  billingFrequency: BillingFrequency;
  amount: number;
  currency: string;
  trialEndDate: string | null;
  renewalDate: string;
  cancellationDeadlineDate: string | null;
  cancellationDeadlineDays: number;
  autoRenew: boolean;
  contractEndDate: string | null;
  isRefundable: boolean;
}

export interface NotificationSchedule {
  id: number;
  daysBeforeEvent: number;
  eventType: NotificationEventType;
  enabled: boolean;
}

export interface Subscription {
  id: number;
  name: string;
  category: string;
  provider: string;
  status: SubscriptionStatus;
  commitmentType: CommitmentType;
  startDate: string;
  notes: string | null;
  cancellationWorkflow: string | null;
  negotiationWorkflow: string | null;
  contractTerm: ContractTerm;
  notificationSchedules: NotificationSchedule[];
}

export interface CreateSubscriptionPayload {
  name: string;
  category: string;
  provider: string;
  status: SubscriptionStatus;
  commitmentType: CommitmentType;
  startDate: string;
  notes?: string | null;
  cancellationWorkflow?: string | null;
  negotiationWorkflow?: string | null;
  contractTerm: {
    billingFrequency: BillingFrequency;
    amount: number;
    currency: string;
    trialEndDate?: string | null;
    renewalDate: string;
    cancellationDeadlineDays: number;
    autoRenew: boolean;
    contractEndDate?: string | null;
    isRefundable: boolean;
  };
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface TimelineEvent {
  subscriptionId: number;
  subscriptionName: string;
  category: string;
  provider: string;
  eventType: NotificationEventType;
  eventDate: string;
  actionDeadline: string;
  amount: number;
  currency: string;
  cancellationWorkflow: string | null;
  negotiationWorkflow: string | null;
  daysRemaining: number;
}

export interface CategoryCost {
  category: string;
  amount: number;
  percentage: number;
}

export interface MonthlyCost {
  month: number;
  monthLabel: string;
  amount: number;
}

export interface Analytics {
  year: number;
  healthScore: number;
  totalAnnualCost: number;
  monthlyAverage: number;
  potentialSavings: number;
  financialLeakage: number;
  categoryBreakdown: CategoryCost[];
  monthlyTrend: MonthlyCost[];
}

export interface UrgentAction {
  subscriptionId: number;
  subscriptionName: string;
  provider: string;
  category: string;
  status: SubscriptionStatus;
  cancellationDeadline: string;
  renewalDate: string;
  daysUntilDeadline: number;
  urgencyLevel: UrgencyLevel;
  amount: number;
  currency: string;
  cancellationWorkflow: string | null;
}

export interface Dashboard {
  healthScore: number;
  totalAnnualCost: number;
  monthlyAverage: number;
  financialLeakage: number;
  potentialSavings: number;
  categoryBreakdown: CategoryCost[];
  monthlyTrend: MonthlyCost[];
  mostUrgentAction: UrgentAction | null;
  urgentActions: UrgentAction[];
}

export interface CalendarEvent {
  subscriptionId: number;
  subscriptionName: string;
  provider: string;
  eventType: string;
  amount: number;
  currency: string;
}

export interface CalendarDay {
  date: string;
  totalAmount: number;
  currency: string;
  events: CalendarEvent[];
}

export interface RenewalHistory {
  id: number;
  subscriptionId: number;
  subscriptionName: string;
  previousAmount: number;
  newAmount: number;
  renewalDate: string;
  changePercentage: number;
  notes: string | null;
}

export interface VendorPreset {
  name: string;
  provider: string;
  category: string;
  amount: number;
  billingFrequency: BillingFrequency;
  cancellationWorkflow: string;
}

export const VENDOR_PRESETS: VendorPreset[] = [
  { name: 'Netflix', provider: 'Netflix', category: 'Entertainment', amount: 15.49, billingFrequency: 'MONTHLY', cancellationWorkflow: 'Go to Account → Membership & Billing → Cancel Membership' },
  { name: 'Spotify', provider: 'Spotify', category: 'Entertainment', amount: 10.99, billingFrequency: 'MONTHLY', cancellationWorkflow: 'Go to Account → Manage Premium → Cancel Premium' },
  { name: 'Adobe Creative Cloud', provider: 'Adobe', category: 'Software', amount: 54.99, billingFrequency: 'MONTHLY', cancellationWorkflow: 'Go to Account → Plans & Products → Manage Plan → Cancel' },
  { name: 'ChatGPT Plus', provider: 'OpenAI', category: 'Software', amount: 20, billingFrequency: 'MONTHLY', cancellationWorkflow: 'Go to Settings → Manage Subscription → Cancel' },
  { name: 'JetBrains', provider: 'JetBrains', category: 'Software', amount: 24.90, billingFrequency: 'MONTHLY', cancellationWorkflow: 'Go to Account → Licenses → Cancel Subscription' },
  { name: 'AWS', provider: 'Amazon', category: 'Software', amount: 50, billingFrequency: 'MONTHLY', cancellationWorkflow: 'Go to AWS Console → Billing → Close Account or cancel services' },
  { name: 'Disney+', provider: 'Disney', category: 'Entertainment', amount: 13.99, billingFrequency: 'MONTHLY', cancellationWorkflow: 'Go to Profile → Account → Cancel Subscription' },
  { name: 'Planet Fitness', provider: 'Planet Fitness', category: 'Fitness', amount: 24.99, billingFrequency: 'MONTHLY', cancellationWorkflow: 'Visit club or call member services to cancel' },
];

export const CATEGORY_COLORS: Record<string, string> = {
  Software: '#4f61c8',
  Entertainment: '#2d3a6b',
  Utilities: '#14b8a6',
  Fitness: '#22c55e',
  Insurance: '#eab308',
  Membership: '#a855f7',
  Financial: '#14b8a6',
  default: '#94a3b8',
};

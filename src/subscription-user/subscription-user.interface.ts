export interface ISubscriptionUser {
  id: string;
  subscriptionId: string;
  subscriptionName: string;
  subscriptionInfo: string;
  createdAt: Date;
  cancelledAt: Date | null;
}

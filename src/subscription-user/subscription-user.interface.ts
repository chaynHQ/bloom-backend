export interface ISubscriptionUser {
  subscriptionId: string;
  subscriptionName: string;
  subscriptionInfo: string;
  createdAt: Date;
  cancelledAt: Date | null;
}

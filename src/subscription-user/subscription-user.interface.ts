export interface ISubscriptionUser {
  subscriptionId: string;
  subscriptionName: string;
  createdAt: Date;
  cancelledAt: Date | null;
}

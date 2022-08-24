export interface ITherapyFeedback {
  bookingCode: string;
  email: string;
  isFeedbackSent: boolean;
  feedbackSentDateTime?: Date | string;
}

/**
 * Conversion funnels — ordered chains of events where each step's count is
 * expressed as a percentage of the first step. A funnel whose entry step
 * had zero activity in the window is skipped entirely (no activity = no
 * funnel to analyse).
 *
 * Percentages are always against the first step ("of the people who
 * viewed / registered / opened, how many completed?"). For 4+ step funnels
 * this is usually more informative than step-over-previous-step.
 *
 * Add a new funnel: append to FUNNELS. Remove by deleting the entry; no
 * other code changes needed.
 */

interface FunnelStep {
  event: string;
  label: string;
}

export interface Funnel {
  label: string;
  steps: FunnelStep[]; // 2 or more
}

export const FUNNELS: Funnel[] = [
  {
    // ABOUT_YOU_VIEWED fires on every visit to /account/about-you, not just
    // post-register, so including it produced >100% funnel steps.
    label: 'Signup flow',
    steps: [
      { event: 'REGISTER_SUCCESS', label: 'Registrations' },
      { event: 'SIGNUP_SURVEY_COMPLETED', label: 'Survey completed' },
    ],
  },
  {
    label: 'Partner code flow',
    steps: [
      { event: 'ASSIGN_NEW_PARTNER_VIEWED', label: 'Apply-code page' },
      { event: 'VALIDATE_ACCESS_CODE_SUCCESS', label: 'Code valid' },
      { event: 'ASSIGN_NEW_PARTNER_ACCESS_SUCCESS', label: 'Partner assigned' },
    ],
  },
  {
    label: 'Course flow',
    steps: [
      { event: 'COURSE_OVERVIEW_VIEWED', label: 'Overview viewed' },
      { event: 'COURSE_INTRO_VIDEO_STARTED', label: 'Intro started' },
      { event: 'COURSE_INTRO_VIDEO_FINISHED', label: 'Intro finished' },
    ],
  },
  {
    label: 'Session flow',
    steps: [
      { event: 'SESSION_VIEWED', label: 'Viewed' },
      { event: 'SESSION_STARTED_SUCCESS', label: 'Started' },
      { event: 'SESSION_COMPLETE_SUCCESS', label: 'Completed' },
      { event: 'SESSION_FEEDBACK_SUBMITTED', label: 'Feedback' },
    ],
  },
  {
    // THERAPY_CONFIRMATION_VIEWED is declared but never fired in the frontend.
    label: 'Therapy flow',
    steps: [
      { event: 'THERAPY_BOOKING_VIEWED', label: 'Page views' },
      { event: 'THERAPY_BOOKING_OPENED', label: 'Booking opened' },
    ],
  },
  {
    label: 'Therapy cancellation flow',
    steps: [
      { event: 'THERAPY_BOOKING_CANCEL_DIALOG_OPENED', label: 'Dialog opened' },
      { event: 'THERAPY_BOOKING_CANCEL_CONFIRMED', label: 'Confirmed' },
      { event: 'THERAPY_BOOKING_CANCELLED', label: 'Cancelled' },
    ],
  },
  {
    label: 'Resource short video flow',
    steps: [
      { event: 'RESOURCE_SHORT_VIDEO_VIEWED', label: 'Viewed' },
      { event: 'RESOURCE_SHORT_VIDEO_STARTED', label: 'Started' },
      { event: 'RESOURCE_SHORT_VIDEO_COMPLETE_SUCCESS', label: 'Completed' },
    ],
  },
  {
    // VIDEO_VIDEO is intentional — see Single videos line in reporting.events.ts.
    label: 'Resource single video flow',
    steps: [
      { event: 'RESOURCE_SINGLE_VIDEO_VIEWED', label: 'Viewed' },
      { event: 'RESOURCE_SINGLE_VIDEO_VIDEO_STARTED', label: 'Started' },
      { event: 'RESOURCE_SINGLE_VIDEO_COMPLETE_SUCCESS', label: 'Completed' },
    ],
  },
  {
    label: 'Resource conversation flow',
    steps: [
      { event: 'RESOURCE_CONVERSATION_VIEWED', label: 'Viewed' },
      { event: 'RESOURCE_CONVERSATION_STARTED_SUCCESS', label: 'Started' },
      { event: 'RESOURCE_CONVERSATION_COMPLETE_SUCCESS', label: 'Completed' },
    ],
  },
  {
    label: 'PWA install flow',
    steps: [
      { event: 'PWA_DESKTOP_BANNER_VIEWED', label: 'Banner viewed' },
      { event: 'PWA_INSTALL_CLICKED', label: 'Install clicked' },
      { event: 'PWA_INSTALLED', label: 'Installed' },
    ],
  },
  {
    label: 'WhatsApp subscribe flow',
    steps: [
      { event: 'WHATSAPP_SUBSCRIBE_REQUEST', label: 'Requested' },
      { event: 'WHATSAPP_SUBSCRIBE_SUCCESS', label: 'Subscribed' },
    ],
  },
  {
    // LOGIN_SUCCESS fires on any successful auth (auto-login, register
    // auto-login, returning sessions), not only after HEADER_LOGIN_CLICKED.
    // LOGIN_REQUEST → LOGIN_SUCCESS is the genuine submission funnel.
    label: 'Login funnel',
    steps: [
      { event: 'LOGIN_REQUEST', label: 'Login submitted' },
      { event: 'LOGIN_SUCCESS', label: 'Logged in' },
    ],
  },
];

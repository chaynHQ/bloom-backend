/**
 * Curated event groups for the Slack digest. Event names must match the
 * values of `logEvent()` calls in `bloom-frontend/lib/constants/events.ts`.
 * The `topic` key drives which topic section in the Slack builder renders
 * the group.
 */

interface EventItem {
  event: string;
  label: string;
}

/** `breakdownParam` adds an inline "by X: A (n), B (n), C (n)" sub-line
 *  from a GA4 custom dimension. The dimension must exist in GA4. */
export interface EventLine {
  label: string;
  items: EventItem[];
  breakdownParam?: string; // GA4 dim API name e.g. 'customEvent:course_name'
  paramLabel?: string; // human label rendered in Slack e.g. 'course'
}

/** Topic keys map an EventGroup into the topic section that renders it. */
export type EventTopic =
  | 'users'
  | 'courses'
  | 'resources'
  | 'therapy'
  | 'messaging'
  | 'communications'
  | 'app'
  | 'navigation'
  | 'promo'
  | 'admin'
  | 'errors';

export interface EventGroup {
  title: string;
  emoji: string;
  topic: EventTopic;
  lines: EventLine[];
  /** Drop all-zero lines (so clean periods produce no Errors block). */
  errorsOnly?: boolean;
}

export const EVENT_GROUPS: EventGroup[] = [
  {
    topic: 'users',
    title: 'Auth & onboarding',
    emoji: ':key:',
    lines: [
      { label: 'Header login clicks', items: [{ event: 'HEADER_LOGIN_CLICKED', label: 'clicks' }] },
      { label: 'Logins', items: [{ event: 'LOGIN_SUCCESS', label: 'success' }] },
      { label: 'Logouts', items: [{ event: 'LOGOUT_SUCCESS', label: 'completed' }] },
      { label: 'Registrations', items: [{ event: 'REGISTER_SUCCESS', label: 'completed' }] },
      {
        label: 'Reset-password link clicks',
        items: [{ event: 'RESET_PASSWORD_HERE_CLICKED', label: 'clicks' }],
      },
      {
        label: 'Password resets',
        items: [{ event: 'RESET_PASSWORD_SUCCESS', label: 'completed' }],
      },
      {
        label: 'Create-account link',
        items: [{ event: 'CREATE_ACCOUNT_LINK_CLICKED', label: 'clicks' }],
      },
      {
        label: 'Signup survey',
        items: [
          { event: 'SIGNUP_SURVEY_COMPLETED', label: 'completed' },
          { event: 'SIGNUP_SURVEY_SKIPPED', label: 'skipped' },
        ],
      },
      {
        label: 'About you form',
        items: [
          { event: 'ABOUT_YOU_VIEWED', label: 'viewed' },
          { event: 'ABOUT_YOU_DEMO_SUCCESS', label: 'demographics submitted' },
          { event: 'ABOUT_YOU_SETA_SUCCESS', label: 'SETA submitted' },
        ],
      },
      {
        label: 'Apply-a-code page viewed',
        items: [{ event: 'ASSIGN_NEW_PARTNER_VIEWED', label: 'views' }],
      },
      {
        label: 'Partner access codes',
        items: [
          { event: 'VALIDATE_ACCESS_CODE_SUCCESS', label: 'redeemed' },
          { event: 'VALIDATE_ACCESS_CODE_INVALID', label: 'invalid (client)' },
          { event: 'ASSIGN_NEW_PARTNER_ACCESS_SUCCESS', label: 'new partner assigned' },
          { event: 'ASSIGN_NEW_PARTNER_ACCESS_INVALID', label: 'invalid (server)' },
        ],
        breakdownParam: 'customEvent:partner',
        paramLabel: 'partner',
      },
    ],
  },
  {
    topic: 'courses',
    title: 'Courses',
    emoji: ':books:',
    lines: [
      { label: 'Course list viewed', items: [{ event: 'COURSE_LIST_VIEWED', label: 'views' }] },
      {
        label: 'Course overview viewed',
        items: [{ event: 'COURSE_OVERVIEW_VIEWED', label: 'views' }],
        breakdownParam: 'customEvent:course_progress',
        paramLabel: 'progress',
      },
      {
        label: 'Course intro video',
        items: [
          { event: 'COURSE_INTRO_VIDEO_STARTED', label: 'started' },
          { event: 'COURSE_INTRO_VIDEO_FINISHED', label: 'finished' },
        ],
      },
      {
        label: 'Course intro transcript',
        // NB: the frontend constant is named `COURSE_INTRO_VIDEO_TRANSCRIPT_OPENED`
        // but its VALUE (what reaches GA4) is `COURSE_INTRO_TRANSCRIPT_OPENED`
        // without `_VIDEO_`. Event name here matches the value.
        items: [
          { event: 'COURSE_INTRO_TRANSCRIPT_OPENED', label: 'opened' },
          { event: 'COURSE_INTRO_TRANSCRIPT_CLOSED', label: 'closed' },
        ],
      },
    ],
  },
  {
    topic: 'courses',
    title: 'Sessions',
    emoji: ':movie_camera:',
    lines: [
      {
        label: 'Session viewed',
        items: [{ event: 'SESSION_VIEWED', label: 'views' }],
        breakdownParam: 'customEvent:session_progress',
        paramLabel: 'progress',
      },
      {
        label: 'Session video',
        items: [
          { event: 'SESSION_VIDEO_STARTED', label: 'started' },
          { event: 'SESSION_VIDEO_FINISHED', label: 'finished' },
        ],
      },
      {
        label: 'Session progression',
        items: [
          { event: 'SESSION_STARTED_SUCCESS', label: 'started' },
          { event: 'SESSION_COMPLETE_SUCCESS', label: 'completed' },
        ],
      },
      {
        label: 'Session transcript',
        items: [
          { event: 'SESSION_TRANSCRIPT_OPENED', label: 'opened' },
          { event: 'SESSION_TRANSCRIPT_CLOSED', label: 'closed' },
        ],
      },
      {
        label: 'Session feedback (GA)',
        items: [{ event: 'SESSION_FEEDBACK_SUBMITTED', label: 'submitted' }],
        breakdownParam: 'customEvent:feedbackTags',
        paramLabel: 'tag',
      },
      {
        label: 'Session chat CTA',
        items: [{ event: 'SESSION_CHAT_BUTTON_CLICKED', label: 'clicks' }],
      },
    ],
  },
  {
    topic: 'therapy',
    title: 'Therapy events',
    emoji: ':speech_balloon:',
    lines: [
      // THERAPY_BOOKINGS_VIEWED (plural) fires when a user opens their *own
      // list* of existing bookings — distinct from THERAPY_BOOKING_VIEWED
      // (singular) which fires on the book-a-new-session page.
      {
        label: 'My bookings list viewed',
        items: [{ event: 'THERAPY_BOOKINGS_VIEWED', label: 'views' }],
      },
      {
        label: 'Book-a-session flow',
        items: [
          { event: 'THERAPY_BOOKING_VIEWED', label: 'page views' },
          { event: 'THERAPY_BOOKING_OPENED', label: 'booking opened' },
          { event: 'THERAPY_CONFIRMATION_VIEWED', label: 'confirmed' },
        ],
      },
      {
        label: 'Therapy cancellations',
        items: [
          { event: 'THERAPY_BOOKING_CANCEL_DIALOG_OPENED', label: 'dialog opened' },
          { event: 'THERAPY_BOOKING_CANCEL_CONFIRMED', label: 'confirmed' },
          { event: 'THERAPY_BOOKING_CANCELLED', label: 'cancelled' },
        ],
      },
      {
        label: 'Therapy joining',
        items: [{ event: 'THERAPY_VIDEO_LINK_CLICKED', label: 'video link clicked' }],
      },
      { label: 'Therapy FAQ', items: [{ event: 'THERAPY_FAQ_OPENED', label: 'opened' }] },
    ],
  },
  {
    topic: 'resources',
    title: 'Resource events',
    emoji: ':headphones:',
    lines: [
      {
        label: 'Conversations',
        items: [
          { event: 'RESOURCE_CONVERSATION_VIEWED', label: 'viewed' },
          { event: 'RESOURCE_CONVERSATION_AUDIO_STARTED', label: 'started' },
          { event: 'RESOURCE_CONVERSATION_AUDIO_FINISHED', label: 'finished' },
          { event: 'RESOURCE_CONVERSATION_COMPLETE_SUCCESS', label: 'completed' },
        ],
        breakdownParam: 'customEvent:resource_name',
        paramLabel: 'resource',
      },
      {
        label: 'Short videos',
        items: [
          { event: 'RESOURCE_SHORT_VIDEO_VIEWED', label: 'viewed' },
          { event: 'RESOURCE_SHORT_VIDEO_STARTED', label: 'started' },
          { event: 'RESOURCE_SHORT_VIDEO_FINISHED', label: 'finished' },
          { event: 'RESOURCE_SHORT_VIDEO_COMPLETE_SUCCESS', label: 'completed' },
        ],
        breakdownParam: 'customEvent:resource_name',
        paramLabel: 'resource',
      },
      {
        label: 'Single videos',
        items: [
          { event: 'RESOURCE_SINGLE_VIDEO_VIEWED', label: 'viewed' },
          { event: 'RESOURCE_SINGLE_VIDEO_VIDEO_STARTED', label: 'started' },
          { event: 'RESOURCE_SINGLE_VIDEO_VIDEO_FINISHED', label: 'finished' },
          { event: 'RESOURCE_SINGLE_VIDEO_COMPLETE_SUCCESS', label: 'completed' },
        ],
        breakdownParam: 'customEvent:resource_name',
        paramLabel: 'resource',
      },
      {
        label: 'Resource feedback (GA)',
        items: [{ event: 'RESOURCE_FEEDBACK_SUBMITTED', label: 'submitted' }],
        breakdownParam: 'customEvent:feedbackTags',
        paramLabel: 'tag',
      },
      {
        label: 'Resource → session navigation',
        items: [
          { event: 'RESOURCE_SHORT_VIDEO_VISIT_SESSION', label: 'from short' },
          { event: 'RESOURCE_SINGLE_VIDEO_VISIT_SESSION', label: 'from single' },
        ],
      },
    ],
  },
  {
    topic: 'messaging',
    title: 'Chat',
    emoji: ':left_speech_bubble:',
    lines: [
      {
        label: 'Chat',
        items: [
          { event: 'CHAT_VIEWED', label: 'opened' },
          { event: 'CHAT_MESSAGE_COMPOSED', label: 'composed' },
          { event: 'CHAT_MESSAGE_SENT', label: 'sent' },
        ],
      },
    ],
  },
  // WhatsApp subscribe/unsubscribe success counts are DB-authoritative — see
  // whatsappSubscribed / whatsappUnsubscribed in DB_METRIC_KEYS. Errors live
  // in the Errors group below because those are frontend-side failures the
  // DB never sees.
  {
    topic: 'communications',
    title: 'Email & comms',
    emoji: ':inbox_tray:',
    lines: [
      {
        label: 'Email reminders (GA — no DB date column)',
        items: [
          { event: 'EMAIL_REMINDERS_SET_SUCCESS', label: 'set' },
          { event: 'EMAIL_REMINDERS_UNSET_SUCCESS', label: 'unset' },
        ],
      },
      {
        label: 'Service emails',
        items: [{ event: 'USER_DISABLED_SERVICE_EMAILS', label: 'disabled' }],
      },
      {
        label: 'Cookies consent',
        items: [
          { event: 'COOKIES_ACCEPTED', label: 'accepted' },
          { event: 'COOKIES_REJECTED', label: 'rejected' },
        ],
      },
    ],
  },
  {
    topic: 'app',
    title: 'App & install',
    emoji: ':rocket:',
    lines: [
      {
        label: 'App loads',
        items: [
          { event: 'PWA_LOADED', label: 'PWA' },
          { event: 'WEB_APP_LOADED', label: 'Web' },
        ],
      },
      {
        label: 'PWA install',
        items: [
          { event: 'PWA_INSTALL_CLICKED', label: 'install clicked' },
          { event: 'PWA_INSTALLED', label: 'installed' },
          { event: 'PWA_DISMISS_CLICKED', label: 'dismiss clicked' },
          { event: 'PWA_DISMISSED', label: 'dismissed' },
        ],
        breakdownParam: 'customEvent:platform',
        paramLabel: 'platform',
      },
      {
        label: 'PWA desktop banner viewed',
        items: [{ event: 'PWA_DESKTOP_BANNER_VIEWED', label: 'views' }],
        breakdownParam: 'customEvent:platform',
        paramLabel: 'platform',
      },
    ],
  },
  {
    topic: 'navigation',
    title: 'Header',
    emoji: ':compass:',
    lines: [
      {
        label: 'Header nav',
        items: [
          { event: 'HEADER_NAVIGATION_MENU_OPENED', label: 'menu opened' },
          { event: 'HEADER_NAVIGATION_MENU_CLOSED', label: 'menu closed' },
          { event: 'HEADER_HOME_LOGO_CLICKED', label: 'home logo' },
          { event: 'HEADER_ACCOUNT_ICON_CLICKED', label: 'account icon' },
          { event: 'HEADER_APPLY_A_CODE_CLICKED', label: 'apply-code' },
          { event: 'HEADER_OUR_BLOOM_TEAM_CLICKED', label: 'our team' },
          { event: 'HEADER_IMMEDIATE_HELP_CLICKED', label: 'immediate help' },
          { event: 'HEADER_ADMIN_CLICKED', label: 'admin' },
        ],
      },
      {
        label: 'Drawer',
        items: [
          { event: 'DRAWER_COURSES_CLICKED', label: 'courses' },
          { event: 'DRAWER_THERAPY_CLICKED', label: 'therapy' },
          { event: 'DRAWER_CHAT_CLICKED', label: 'chat' },
          { event: 'DRAWER_NOTES_CLICKED', label: 'notes' },
          { event: 'DRAWER_ACTIVITIES_CLICKED', label: 'activities' },
          { event: 'DRAWER_GROUNDING_CLICKED', label: 'grounding' },
          { event: 'DRAWER_OUR_BLOOM_TEAM_CLICKED', label: 'our team' },
          { event: 'DRAWER_IMMEDIATE_HELP_CLICKED', label: 'immediate help' },
          { event: 'DRAWER_ADMIN_CLICKED', label: 'admin' },
          { event: 'DRAWER_LOGIN_CLICKED', label: 'login' },
        ],
      },
      {
        label: 'Secondary header',
        items: [
          { event: 'SECONDARY_HEADER_COURSES_CLICKED', label: 'courses' },
          { event: 'SECONDARY_HEADER_THERAPY_CLICKED', label: 'therapy' },
          { event: 'SECONDARY_HEADER_CHAT_CLICKED', label: 'chat' },
          { event: 'SECONDARY_HEADER_NOTES_CLICKED', label: 'notes' },
          { event: 'SECONDARY_HEADER_ACTIVITIES_CLICKED', label: 'activities' },
          { event: 'SECONDARY_HEADER_GROUNDING_CLICKED', label: 'grounding' },
        ],
      },
      {
        label: 'Language menu',
        items: [{ event: 'HEADER_LANGUAGE_MENU_CLICKED', label: 'opens' }],
      },
      {
        // Event names produced dynamically by
        // bloom-frontend/lib/constants/events.ts::generateLanguageMenuEvent
        // using the `locales` list in bloom-frontend/i18n/routing.ts
        // (en, de, fr, es, pt, hi). Add a locale here if the frontend adds one.
        label: 'Language switches',
        items: [
          { event: 'HEADER_LANGUAGE_EN_CLICKED', label: 'EN' },
          { event: 'HEADER_LANGUAGE_DE_CLICKED', label: 'DE' },
          { event: 'HEADER_LANGUAGE_FR_CLICKED', label: 'FR' },
          { event: 'HEADER_LANGUAGE_ES_CLICKED', label: 'ES' },
          { event: 'HEADER_LANGUAGE_PT_CLICKED', label: 'PT' },
          { event: 'HEADER_LANGUAGE_HI_CLICKED', label: 'HI' },
        ],
      },
      {
        label: 'On-page engagement',
        items: [
          { event: 'FAQ_OPENED', label: 'FAQ opens' },
          { event: 'ACCORDION_OPENED', label: 'accordion opens' },
          { event: 'RELATED_CONTENT_CARD_CLICK', label: 'related content' },
          { event: 'MEET_THE_TEAM_VIEWED', label: 'meet team' },
          { event: 'LEAVE_SITE_BUTTON_CLICKED', label: 'leave-site button' },
        ],
        breakdownParam: 'customEvent:accordionTitle',
        paramLabel: 'accordion title',
      },
      {
        label: 'Social links',
        items: [
          { event: 'SOCIAL_LINK_CLICKED', label: 'social' },
          { event: 'PARTNER_SOCIAL_LINK_CLICKED', label: 'partner social' },
        ],
        breakdownParam: 'customEvent:social_account',
        paramLabel: 'account',
      },
    ],
  },
  {
    topic: 'promo',
    title: 'Promo & banners',
    emoji: ':loudspeaker:',
    lines: [
      { label: 'Promo CTA', items: [{ event: 'PROMO_GET_STARTED_CLICKED', label: 'clicks' }] },
      {
        label: 'Sign-up-today banner',
        items: [{ event: 'SIGN_UP_TODAY_BANNER_BUTTON_CLICKED', label: 'clicks' }],
      },
      {
        label: 'Notes-from-Bloom promo',
        items: [{ event: 'NOTES_FROM_BLOOM_PROMO_CLICKED', label: 'clicks' }],
      },
      {
        label: 'User-research banner',
        items: [
          { event: 'USER_BANNER_INTERESTED', label: 'interested' },
          { event: 'USER_BANNER_DISMISSED', label: 'dismissed' },
        ],
      },
      {
        label: 'Fruitz retirement banner',
        items: [{ event: 'FRUITZ_RETIREMENT_BANNER_DISMISSED', label: 'dismissed' }],
      },
    ],
  },
  {
    topic: 'admin',
    title: 'Admin activity',
    emoji: ':gear:',
    lines: [
      {
        label: 'Admin dashboard viewed',
        items: [{ event: 'ADMIN_DASHBOARD_VIEWED', label: 'views' }],
      },
      {
        label: 'Partner access codes created',
        items: [{ event: 'CREATE_PARTNER_ACCESS_SUCCESS', label: 'success' }],
      },
      {
        label: 'Partner admin changes',
        items: [
          { event: 'CREATE_PARTNER_ADMIN_SUCCESS', label: 'created' },
          { event: 'UPDATE_PARTNER_ADMIN', label: 'updated' },
        ],
      },
      {
        label: 'Partner active toggles',
        items: [{ event: 'UPDATE_PARTNER_ACTIVE_SUCCESS', label: 'toggles' }],
      },
      {
        label: 'Therapy sessions adjusted',
        items: [{ event: 'UPDATE_THERAPY_SESSIONS', label: 'updates' }],
      },
    ],
  },
  {
    topic: 'errors',
    title: 'Errors',
    emoji: ':rotating_light:',
    errorsOnly: true,
    lines: [
      { label: 'Login errors', items: [{ event: 'LOGIN_ERROR', label: 'errors' }] },
      { label: 'Forced logouts', items: [{ event: 'LOGOUT_FORCED', label: 'forced' }] },
      { label: 'Register errors', items: [{ event: 'REGISTER_ERROR', label: 'errors' }] },
      {
        label: 'User load errors',
        items: [
          { event: 'GET_LOGIN_USER_ERROR', label: 'login' },
          { event: 'GET_AUTH_USER_ERROR', label: 'auth' },
          { event: 'GET_USER_ERROR', label: 'generic' },
        ],
      },
      {
        label: 'Password reset errors',
        items: [{ event: 'RESET_PASSWORD_ERROR', label: 'errors' }],
      },
      {
        label: 'Access code errors',
        items: [
          { event: 'VALIDATE_ACCESS_CODE_ERROR', label: 'validate' },
          { event: 'ASSIGN_NEW_PARTNER_ACCESS_ERROR', label: 'assign' },
        ],
      },
      {
        label: 'About you form errors',
        items: [
          { event: 'ABOUT_YOU_DEMO_ERROR', label: 'demographics' },
          { event: 'ABOUT_YOU_SETA_ERROR', label: 'SETA' },
        ],
      },
      {
        label: 'Session errors',
        items: [
          { event: 'SESSION_STARTED_ERROR', label: 'start' },
          { event: 'SESSION_COMPLETE_ERROR', label: 'complete' },
        ],
      },
      {
        label: 'Resource errors',
        items: [
          { event: 'RESOURCE_CONVERSATION_STARTED_ERROR', label: 'conv start' },
          { event: 'RESOURCE_CONVERSATION_COMPLETE_ERROR', label: 'conv complete' },
          { event: 'RESOURCE_SHORT_VIDEO_STARTED_ERROR', label: 'short start' },
          { event: 'RESOURCE_SHORT_VIDEO_COMPLETE_ERROR', label: 'short complete' },
          { event: 'RESOURCE_SINGLE_VIDEO_STARTED_ERROR', label: 'single start' },
          { event: 'RESOURCE_SINGLE_VIDEO_COMPLETE_ERROR', label: 'single complete' },
        ],
      },
      {
        label: 'Therapy errors',
        items: [
          { event: 'THERAPY_BOOKING_CANCELLED_ERROR', label: 'cancel' },
          { event: 'THERAPY_BOOKINGS_LOAD_ERROR', label: 'load' },
        ],
      },
      {
        label: 'WhatsApp errors',
        items: [
          { event: 'WHATSAPP_SUBSCRIBE_ERROR', label: 'subscribe' },
          { event: 'WHATSAPP_UNSUBSCRIBE_ERROR', label: 'unsubscribe' },
        ],
      },
      {
        label: 'Email reminder errors',
        items: [
          { event: 'EMAIL_REMINDERS_SET_ERROR', label: 'set' },
          { event: 'EMAIL_REMINDERS_UNSET_ERROR', label: 'unset' },
        ],
      },
      {
        label: 'Admin errors',
        items: [
          { event: 'CREATE_PARTNER_ACCESS_ERROR', label: 'create partner access' },
          { event: 'CREATE_PARTNER_ADMIN_ERROR', label: 'create partner admin' },
          { event: 'UPDATE_PARTNER_ACTIVE_ERROR', label: 'update partner active' },
          { event: 'UPDATE_THERAPY_SESSIONS_ERROR', label: 'update therapy sessions' },
          { event: 'UPDATE_PARTNER_ADMIN_ERROR', label: 'update partner admin' },
        ],
      },
    ],
  },
];

/**
 * Built-in GA4 dimensions for global "Top N" rollups under the App topic.
 * Custom dimensions go on individual EventLines via `breakdownParam` so
 * they render as `↳` sub-breakdowns under the relevant event.
 */
interface BreakdownSpec {
  apiName: string; // GA4 Data API dimension name
  displayName: string; // Slack label
}

export const BREAKDOWNS: BreakdownSpec[] = [
  { apiName: 'pagePath', displayName: 'Top pages' },
  { apiName: 'sessionSource', displayName: 'Top traffic sources' },
  { apiName: 'deviceCategory', displayName: 'Device category' },
  { apiName: 'country', displayName: 'Top countries' },
  { apiName: 'customEvent:account_type', displayName: 'Account type (public vs partner)' },
];

/** Events the Slack message references via EVENT_GROUPS / FUNNELS. Used by
 *  persistence to trim daily ga4Events rows; weekly+ keeps the full
 *  literal copy. Computed lazily — FUNNELS imports cycle if loaded at init. */
let _renderedNames: Set<string> | null = null;
export function renderedEventNames(): ReadonlySet<string> {
  if (_renderedNames) return _renderedNames;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { FUNNELS } = require('./reporting.funnels') as typeof import('./reporting.funnels');
  const set = new Set<string>();
  for (const g of EVENT_GROUPS) for (const l of g.lines) for (const i of l.items) set.add(i.event);
  for (const f of FUNNELS) for (const s of f.steps) set.add(s.event);
  _renderedNames = set;
  return set;
}

/** GA4 event names whose per-period count is anomaly-watched alongside the
 *  DB metrics + GA overview. Curated to high-signal errors + key conversions —
 *  noisy events (PWA_LOADED, page_view) would surface false positives. */
export interface AnomalyWatchedEvent {
  event: string;
  /** Human label rendered in the "Worth looking at" anomaly bullet. */
  label: string;
}

export const ANOMALY_WATCHED_EVENTS: ReadonlyArray<AnomalyWatchedEvent> = [
  // Key conversions — a sudden drop in any of these is the first thing
  // worth paging on even if no error bucket spiked.
  { event: 'REGISTER_SUCCESS', label: 'Registrations' },
  { event: 'LOGIN_SUCCESS', label: 'Logins' },
  { event: 'SESSION_COMPLETE_SUCCESS', label: 'Session completions (GA)' },
  { event: 'THERAPY_CONFIRMATION_VIEWED', label: 'Therapy bookings confirmed' },
  { event: 'VALIDATE_ACCESS_CODE_SUCCESS', label: 'Partner codes redeemed' },
  // Errors
  { event: 'LOGIN_ERROR', label: 'Login errors' },
  { event: 'REGISTER_ERROR', label: 'Registration errors' },
  { event: 'RESET_PASSWORD_ERROR', label: 'Password reset errors' },
  { event: 'SESSION_STARTED_ERROR', label: 'Session start errors' },
  { event: 'SESSION_COMPLETE_ERROR', label: 'Session completion errors' },
  { event: 'RESOURCE_CONVERSATION_COMPLETE_ERROR', label: 'Conversation completion errors' },
  { event: 'RESOURCE_SHORT_VIDEO_COMPLETE_ERROR', label: 'Short video completion errors' },
  { event: 'RESOURCE_SINGLE_VIDEO_COMPLETE_ERROR', label: 'Single video completion errors' },
  { event: 'WHATSAPP_SUBSCRIBE_ERROR', label: 'WhatsApp subscribe errors' },
  { event: 'WHATSAPP_UNSUBSCRIBE_ERROR', label: 'WhatsApp unsubscribe errors' },
  { event: 'THERAPY_BOOKING_CANCELLED_ERROR', label: 'Therapy cancellation errors' },
  { event: 'THERAPY_BOOKINGS_LOAD_ERROR', label: 'Therapy load errors' },
  { event: 'EMAIL_REMINDERS_SET_ERROR', label: 'Email reminder errors' },
  { event: 'VALIDATE_ACCESS_CODE_ERROR', label: 'Access code validation errors' },
  { event: 'ASSIGN_NEW_PARTNER_ACCESS_ERROR', label: 'Partner assign errors' },
];

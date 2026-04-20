/**
 * Curated event groups for the Slack digest.
 *
 * Each group renders as one Slack block. Lines with multiple items render
 * inline (e.g. "Session videos — started (32) · finished (20)"). Zero-count
 * items are dropped from each line; lines where every item is zero are
 * dropped entirely — so a clean day produces no Errors section at all.
 *
 * Event names match the frontend `logEvent()` calls in
 * `bloom-frontend/lib/constants/events.ts`. Add new events here to surface
 * them in the digest; unlisted events still land in GA4 but aren't rendered
 * (they appear under "Uncategorised events" as a prompt to classify them).
 */

interface EventItem {
  event: string;
  label: string;
}

/**
 * A renderable line in the digest.
 *
 * `breakdownParam` opts a line into an inline "by X: A (n), B (n), C (n)"
 * sub-line showing the top values of a GA4 custom dimension, filtered to the
 * events in this line. Requires the custom dimension to exist in GA4 (see
 * BREAKDOWNS doc below).
 */
export interface EventLine {
  label: string;
  items: EventItem[];
  breakdownParam?: string; // GA4 dim API name e.g. 'customEvent:course_name'
  paramLabel?: string; // human label rendered in Slack e.g. 'course'
}

export interface EventGroup {
  title: string;
  emoji: string;
  lines: EventLine[];
  /**
   * When true, lines with all-zero counts are dropped from the digest so a
   * clean day produces no Errors section at all. Non-error groups always
   * render every configured line (including zeros) so the week-over-week
   * structure of the digest stays identical.
   */
  errorsOnly?: boolean;
}

export const EVENT_GROUPS: EventGroup[] = [
  {
    title: 'Auth & onboarding',
    emoji: ':key:',
    lines: [
      {
        label: 'Logins',
        items: [{ event: 'LOGIN_SUCCESS', label: 'success' }],
        breakdownParam: 'customEvent:partner',
        paramLabel: 'partner',
      },
      {
        label: 'Registrations',
        items: [{ event: 'REGISTER_SUCCESS', label: 'completed' }],
        breakdownParam: 'customEvent:partner',
        paramLabel: 'partner',
      },
      { label: 'Password resets', items: [{ event: 'RESET_PASSWORD_SUCCESS', label: 'completed' }] },
      { label: 'Logouts', items: [{ event: 'LOGOUT_SUCCESS', label: 'completed' }] },
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
    title: 'Courses',
    emoji: ':books:',
    lines: [
      { label: 'Course list viewed', items: [{ event: 'COURSE_LIST_VIEWED', label: 'views' }] },
      {
        label: 'Course overview viewed',
        items: [{ event: 'COURSE_OVERVIEW_VIEWED', label: 'views' }],
        breakdownParam: 'customEvent:course_name',
        paramLabel: 'course',
      },
      {
        label: 'Course intro video',
        items: [
          { event: 'COURSE_INTRO_VIDEO_STARTED', label: 'started' },
          { event: 'COURSE_INTRO_VIDEO_FINISHED', label: 'finished' },
        ],
        breakdownParam: 'customEvent:course_name',
        paramLabel: 'course',
      },
      {
        label: 'Course intro transcript',
        // NB: the frontend constant is named `COURSE_INTRO_VIDEO_TRANSCRIPT_OPENED`
        // but its VALUE (what reaches GA4) is `COURSE_INTRO_TRANSCRIPT_OPENED`
        // without `_VIDEO_`. Event name here matches the value.
        items: [{ event: 'COURSE_INTRO_TRANSCRIPT_OPENED', label: 'opened' }],
        breakdownParam: 'customEvent:course_name',
        paramLabel: 'course',
      },
    ],
  },
  {
    title: 'Sessions',
    emoji: ':movie_camera:',
    lines: [
      {
        label: 'Session viewed',
        items: [{ event: 'SESSION_VIEWED', label: 'views' }],
        breakdownParam: 'customEvent:session_name',
        paramLabel: 'session',
      },
      {
        label: 'Session video',
        items: [
          { event: 'SESSION_VIDEO_STARTED', label: 'started' },
          { event: 'SESSION_VIDEO_FINISHED', label: 'finished' },
        ],
        breakdownParam: 'customEvent:session_name',
        paramLabel: 'session',
      },
      {
        label: 'Session progression',
        items: [
          { event: 'SESSION_STARTED_SUCCESS', label: 'started' },
          { event: 'SESSION_COMPLETE_SUCCESS', label: 'completed' },
        ],
        breakdownParam: 'customEvent:session_name',
        paramLabel: 'session',
      },
      {
        label: 'Session transcript',
        // NB: frontend value is `SESSION_TRANSCRIPT_OPENED` (no `_VIDEO_`);
        // the exported constant name carries `VIDEO` but the string doesn't.
        items: [{ event: 'SESSION_TRANSCRIPT_OPENED', label: 'opened' }],
      },
      {
        label: 'Session feedback',
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
    title: 'Therapy',
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
    title: 'Resources',
    emoji: ':headphones:',
    lines: [
      {
        label: 'Conversations',
        items: [
          { event: 'RESOURCE_CONVERSATION_VIEWED', label: 'viewed' },
          { event: 'RESOURCE_CONVERSATION_STARTED', label: 'started' },
          { event: 'RESOURCE_CONVERSATION_FINISHED', label: 'finished' },
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
          { event: 'RESOURCE_SINGLE_VIDEO_STARTED', label: 'started' },
          { event: 'RESOURCE_SINGLE_VIDEO_FINISHED', label: 'finished' },
          { event: 'RESOURCE_SINGLE_VIDEO_COMPLETE_SUCCESS', label: 'completed' },
        ],
        breakdownParam: 'customEvent:resource_name',
        paramLabel: 'resource',
      },
      {
        label: 'Resource feedback',
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
  {
    title: 'WhatsApp',
    emoji: ':iphone:',
    lines: [
      {
        label: 'WhatsApp',
        items: [
          { event: 'WHATSAPP_SUBSCRIBE_SUCCESS', label: 'subscribed' },
          { event: 'WHATSAPP_UNSUBSCRIBE_SUCCESS', label: 'unsubscribed' },
        ],
      },
    ],
  },
  {
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
    title: 'Preferences & consent',
    emoji: ':cookie:',
    lines: [
      {
        label: 'Cookies',
        items: [
          { event: 'COOKIES_ACCEPTED', label: 'accepted' },
          { event: 'COOKIES_REJECTED', label: 'rejected' },
        ],
      },
      {
        label: 'Service emails',
        items: [{ event: 'USER_DISABLED_SERVICE_EMAILS', label: 'disabled' }],
      },
      {
        label: 'Email reminders',
        items: [
          { event: 'EMAIL_REMINDERS_SET_SUCCESS', label: 'set' },
          { event: 'EMAIL_REMINDERS_UNSET_SUCCESS', label: 'unset' },
        ],
      },
    ],
  },
  {
    title: 'Navigation & engagement',
    emoji: ':compass:',
    lines: [
      { label: 'FAQ opened', items: [{ event: 'FAQ_OPENED', label: 'opens' }] },
      {
        label: 'Accordion opened',
        items: [{ event: 'ACCORDION_OPENED', label: 'opens' }],
        breakdownParam: 'customEvent:accordionTitle',
        paramLabel: 'title',
      },
      { label: 'Promo CTA', items: [{ event: 'PROMO_GET_STARTED_CLICKED', label: 'clicks' }] },
      {
        label: 'Social links',
        items: [
          { event: 'SOCIAL_LINK_CLICKED', label: 'social' },
          { event: 'PARTNER_SOCIAL_LINK_CLICKED', label: 'partner' },
        ],
        breakdownParam: 'customEvent:social_account',
        paramLabel: 'account',
      },
      {
        label: 'Leave site button',
        items: [{ event: 'LEAVE_SITE_BUTTON_CLICKED', label: 'clicks' }],
      },
      {
        label: 'Meet the team viewed',
        items: [{ event: 'MEET_THE_TEAM_VIEWED', label: 'views' }],
      },
      {
        label: 'Related content card',
        items: [{ event: 'RELATED_CONTENT_CARD_CLICK', label: 'clicks' }],
      },
      {
        label: 'Language menu opened',
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
    ],
  },
  {
    title: 'Promo & banners',
    emoji: ':loudspeaker:',
    lines: [
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
      { label: 'Password reset errors', items: [{ event: 'RESET_PASSWORD_ERROR', label: 'errors' }] },
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
 * Global GA4 breakdowns — "Top N" sections rendered once at the bottom of
 * the digest, independent of any specific event.
 *
 * Only built-in GA4 dimensions live here. Custom dimensions (course_name,
 * session_name, partner, feedbackTags, accordionTitle, social_account,
 * platform, etc.) are shown as per-line `↳` sub-breakdowns under the events
 * they contextually belong to — putting them here AND under their events
 * would double-render the same data.
 *
 * The custom dims still need to be registered in GA4 (see the per-line
 * `breakdownParam` fields in EVENT_GROUPS) so the per-line breakdowns work.
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
];

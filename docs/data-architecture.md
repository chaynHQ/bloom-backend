## Database models

![Database models](../database_models.jpg 'Database models')

**User**
Stores basic profile data for a user and relationships.

**Partner**
Stores basic profile data for a partner and relationships.

**Partner Admin**
Stores relationship between a partner and a user, and the partner access records created by the partner admin.

**Partner Access**
Stores the features assigned for a user by a partner. When a partner access record is created by a partner admin user, it is initially unassigned but the unique code generated will be shared with the user. When the user registers using this code, the partner access will be assigned/related to the user, granting them access to extra features. See `assignPartnerAccess`. Currently there are "tiers" of access determined by the frontend, however if future partners want different features for their users, settings for their features/tiers should be added to the `Partner` model.

**Therapy Session**
Stores data related to therapy sessions booked via Simplybook, copying the session time and details about the therapist etc. The duplication of data here (vs leaving it in Simplybook) was made to allow therapy reporting to be included in Data Studio. This model also allows for displaying therapy session data on the frontend. Populated by Simplybook -> Zapier webhooks.

**Course**
Stores data related to courses in Storyblok, copying the story id's. The `Course` records allow us to relate users to courses (via `CourseUser`) and a `Course` to `Session` records, which is required e.g. to check if a user completed a course. The slug and name etc are also stored for convenience, e.g. to be used in reporting. Populated and updated by Storyblok webhooks when course stories are published.

**Session**
Stores data related to courses in Storyblok, copying the story id's. The `Session` records allow us to relate users to sessions (via `SessionUser`). The slug and name etc are also stored for convenience, e.g. to be used in reporting. Populated and updated by Storyblok webhooks when course stories are published.

**CourseUser**
Stores relationship between a `User` and `Course` records, once a user has started a course. A users progress (`completed`) for the course is updated (`true`) when all related `SessionUser` records are `completed` for the related `Course`.

**SessionUser**
Stores relationship between a `User` and `Session` records, once a user has started a session. A users session progress (`completed`) for the session is updated (true) when the `/complete` endpoint is called.
# Courses, sessions and resources

Bloom's learning content is written in Storyblok. The backend keeps one row per course, session and resource, synced by the Storyblok webhook, and records each member's progress against them. Mailchimp, Front and the Slack digest read that progress.

A course is built in one of two ways, decided per language in Storyblok: **weeks of sessions** (each session belongs to one course) or **an ordered list of resources** (shared library content). The frontend's [courses-sessions-and-resources.md](https://github.com/chaynHQ/bloom-frontend/blob/develop/docs/courses-sessions-and-resources.md) covers the content model and pages, and its [modular-courses-plan.md](https://github.com/chaynHQ/bloom-frontend/blob/develop/docs/modular-courses-plan.md) covers the history and the plan to move every course onto resources.

## Tables

| Table             | Rows                                                                                                        | Key columns                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `course`          | One per Storyblok `Course`                                                                                  | `storyblokUuid`, `name` (default language), `slug`, `status`, `themes`              |
| `session`         | One per `Session` or `session_iba`                                                                          | `courseId` (its one course), `storyblokUuid`, `status`                              |
| `resource`        | One per `resource_video`, `resource_audio`, `resource_written`, `resource_activity` or `resource_grounding` | `category` (from the component), `storyblokUuid`, `status`                          |
| `course_resource` | A course's listed resources                                                                                 | `courseId`, `resourceId`, both cascading. `course.resources` ⇄ `resource.courses`   |
| `course_partner`  | A course's partners                                                                                         | From `included_for_partners`                                                        |
| `course_user`     | A member's progress on a course                                                                             | Unique (`userId`, `courseId`); `completed`, `completedAt`                           |
| `session_user`    | A member's progress on a session                                                                            | Under a `course_user`; unique (`courseUserId`, `sessionId`)                         |
| `resource_user`   | A member's progress on a resource                                                                           | `userId`, `resourceId`, `completedAt`. **No unique index**, so duplicates can exist |

A course with `course_resource` rows is a resources course. A weeks course has none, and links to its sessions through `session.courseId`. `status` follows Storyblok: published, unpublished or deleted.

## Syncing from Storyblok

`POST /webhooks/storyblok` (`src/webhooks/`) checks the `webhook-signature` header against `STORYBLOK_WEBHOOK_SECRET`, then:

- **Unpublished or deleted:** updates the matching row's `status` only (`updateInactiveStoryStatus`).
- **Published or moved:** fetches the published story in the default language and creates or updates its row (`updateOrCreateStoryData`). The component decides the table (`STORYBLOK_PAGE_COMPONENTS`).

For a **course**, it also:

- reads `content.sessions` in the default language and in each of `content.languages`, and links the course to every resource listed in any of them, replacing the old links (`getCourseResources`). If a language fetch fails, nothing is saved;
- creates a `resource` row for any listed resource that hasn't been synced yet;
- logs a warning for any it can't find, usually an unpublished resource. Publish it, then the course again;
- syncs `course_partner`;
- for a new course, tries once to create the Mailchimp merge fields `C_<initials>` and `C_<initials>_S` (`createMailchimpCourseMergeField`). If the first fails, the second isn't attempted, and failures are only logged.

Initials come from `getAcronym(name)`: the first letter of each word, skipping lower-case "in, and, the, from, as, or, to". They name the Mailchimp and Front fields, so they must be unique across courses, and a published course must never be renamed.

## Progress

### Sessions (`/v1/session-user`)

`POST /`, `/complete` and `/incomplete` find the session and its course, create the `course_user` and `session_user` as needed, and run `checkCourseIsComplete`: the course is complete when the completed `session_user` rows equal the course's published sessions. That check is **two-way**, so un-completing a session un-completes the course. Responses include `courseStarted` and `courseCompleted`, true only when this request created the `course_user` or changed it to completed.

### Resources (`/v1/resource-user`)

`POST /`, `/complete` and `/incomplete` create or update the `resource_user`. `completedAt` is set even when completion arrives before any start. With an optional `courseStoryblokUuid`, `updateCourseUserProgress` (`resource-user.service.ts`) also:

1. **Starts the course** when the resource is linked to it: `createCourseUserIfMissing` inserts and ignores conflicts, so a start and a complete arriving together create one row.
2. **Checks completion** after any resource completion, with or without a course, for each of the member's incomplete courses that link this resource (`checkCourseResourcesAreComplete`). A course is complete when it has at least one published linked resource and the member has a completed `resource_user` for every one. Because resources from every language are linked, languages that list resources must list the same ones.
3. **Completes one way:** `setCourseUserCompletedIfIncomplete` only changes `false` to `true`, so concurrent requests sync once, and `/incomplete` never un-completes a course.
4. **Syncs Mailchimp and Front** after a start or a completion (`updateServiceUserProfilesForCourse`, not awaited, with its own error handling).

All course logic is wrapped so that it can't fail the resource response. The response's `courseProgress` lists `{ storyblokUuid, name, started, completed }` for each course this request started or completed, and is left out otherwise.

### Courses (`GET /v1/courses-user`)

Returns the member's `course_user` rows, each with `completed` and its `sessions`. A resources course returns `sessions: []`; the frontend reads its resource progress from the member's resources.

## Mailchimp and Front

`serializeCourseData` (`src/service-user-profiles/`) builds two fields per course from a `course_user`:

| Mailchimp        | Front                        | Value                                                                                        |
| ---------------- | ---------------------------- | -------------------------------------------------------------------------------------------- |
| `C_<INITIALS>`   | `course_<initials>`          | `Started` or `Completed`                                                                     |
| `C_<INITIALS>_S` | `course_<initials>_sessions` | `<session initials>:C` or `:S` for each session, joined by `; `. Empty for resources courses |

Front's custom-field update replaces the whole set, so every field must exist in Front first. A missing field makes the whole update fail for that member. Front fields are created by hand.

## Reporting

`src/reporting/` builds the Slack digest:

- **Database:** courses started and completed come from `course_user` `createdAt` and `completedAt`. The per-course breakdown lists sessions for weeks courses, and for resources courses lists each linked resource, counting `resource_user` rows by members with a `course_user` for that course (`db-metrics.service.ts`).
- **GA4** (`reporting.events.ts`): includes "Course progress" from the frontend's `COURSE_STARTED` and `COURSE_COMPLETED` events, broken down by `course_name`, which is the backend course name.

## Gotchas

- The global `ValidationPipe` uses `whitelist: true`, so unknown body fields are dropped, not rejected.
- `resource_user` duplicates are tolerated everywhere: completion looks for any completed row.
- A member who uses a mixed course (weeks in one language, resources in another) in both languages can have a completion undone by the session check. This is rare, and goes away once every course is on resources.
- The webhook only ever sees published content. Drafts on staging have no backend rows until they're published.

## Where the code is

| Concern                                          | Code                                                                                                                                                     |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entities                                         | `src/entities/course.entity.ts`, `session.entity.ts`, `resource.entity.ts`, `course-user.entity.ts`, `session-user.entity.ts`, `resource-user.entity.ts` |
| Storyblok sync                                   | `src/webhooks/webhooks.service.ts`                                                                                                                       |
| Session progress                                 | `src/session-user/`                                                                                                                                      |
| Resource progress and resource course completion | `src/resource-user/`                                                                                                                                     |
| Course progress records                          | `src/course-user/`                                                                                                                                       |
| Mailchimp and Front                              | `src/service-user-profiles/`, `src/api/mailchimp/`                                                                                                       |
| Reporting                                        | `src/reporting/`                                                                                                                                         |

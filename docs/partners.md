# Partners

A partner is an organisation whose members use Bloom through it, such as Bumble or Badoo. Members join with an access code from a partner admin, or without one if the partner has an automatic access code. Branding lives in Storyblok, not here: the frontend's [docs/partners.md](https://github.com/chaynHQ/bloom-frontend/blob/develop/docs/partners.md) covers the `partner` content type, welcome pages, image generation and the content team's steps.

## How a partner is added

1. **The content team publishes `partners/<slug>` in Storyblok.** Staging and production share one Storyblok space, so each backend's webhook creates the `partner` row in its own database: **inactive**, therapy limit 0, no automatic access code. Publishing never activates a partner, so publishing during staging setup is safe: production stays off until a super admin activates the partner there.
2. **A super admin launches it in each environment's admin dashboard,** staging first. They set the therapy limit, automatic access code and, for a sub-brand, its parent, create partner admins, and activate the partner. Only this makes it live, with a published `welcome/<slug>` story in production.

Never deactivate a partner to hide it: deactivating also deactivates every partner admin and every member's access.

## Tables

| Table             | Rows                                           | Key columns                                                                                |
| ----------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `partner`         | One per partner                                | `name`, `slug` (unique), `storyblokUuid`, `isActive`, `therapySessionsPerCode`, `parentId` |
| `partner_feature` | A partner's features                           | `AUTOMATIC_ACCESS_CODE`: members can join without a code while `active` is true            |
| `partner_admin`   | A user who creates codes for a partner         | `partnerId`, `userId`, `active`                                                            |
| `partner_access`  | An access code, assigned to a member once used | `featureTherapy`, `therapySessionsRemaining`, `featureLiveChat`, `active`                  |

`slug` is the partner's permanent key: the frontend pairs it with the `partners/<slug>` and `welcome/<slug>` stories. It comes from the story's slug, which the content team sets when creating the story; Storyblok fills it from the story name unless they change it. It can't change once the story is published. Partners are only created this way: there's no API for creating one.

## Syncing from Storyblok

When a `partner` story is published or moved, `updateOrCreatePartner` (`src/webhooks/webhooks.service.ts`) finds the row by `storyblokUuid`, then `slug`, then exact name, ignoring case, and saves the story's uuid on it. If nothing matches, it creates the row inactive. It never changes an existing row's `isActive`, `name` or `slug`; a difference is only logged, and a developer changes the row if it's really needed. Unpublishing or deleting a partner story does nothing. If a webhook was missed, for example because it was blocked, publishing the story again creates or links the row: the sync is safe to repeat.

## Settings (`PATCH /v1/partner/:id`, super admin)

- `active`: cascades to the partner's admins and accesses only when it changes the partner's status, so re-sending the current value can't reactivate accesses that were switched off one by one.
- `therapySessionsPerCode` (0–20): the most therapy sessions a new access code can include. 0 means no therapy. Creating a code over the limit, or with therapy when the limit is 0, returns 400. Existing codes keep their sessions.
- `automaticAccessCode`: switches the `AUTOMATIC_ACCESS_CODE` `partner_feature` row on or off, creating it the first time.
- `parentId`: makes the partner a sub-brand of another, such as Bumble For Friends of Bumble; `null` clears it. One level only: the parent can't be a sub-brand itself, and a partner with sub-brands can't be given a parent. A sub-brand is still its own partner, with its own access codes, admins and settings. The frontend shows a brand's logo once, and reports can group a brand's partners by it.

## Lookups

`GET /v1/partner/:name` and the course sync (`included_for_partners`) find a partner by name, ignoring case, or by slug. `GET /v1/partner/active` (public) lists the active partners' `id`, `name`, `slug` and `parentId`.

## Where the code is

| Concern               | Code                                                         |
| --------------------- | ------------------------------------------------------------ |
| Partners and settings | `src/partner/`                                               |
| Access codes          | `src/partner-access/`                                        |
| Partner admins        | `src/partner-admin/`                                         |
| Features              | `src/partner-feature/`, `src/feature/`                       |
| Storyblok sync        | `src/webhooks/webhooks.service.ts` (`updateOrCreatePartner`) |

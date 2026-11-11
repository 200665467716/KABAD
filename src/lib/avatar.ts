/**
 * Address of a member's profile photo, or null without one: the screens then show the initials.
 * "photoAt" is the version of the picture, so a new photo is never hidden by the browser's cache.
 */
export const avatarUrl = (u: { id: string; photoAt: Date | null }) => (u.photoAt ? `/api/members/${u.id}/photo?v=${u.photoAt.getTime()}` : null);

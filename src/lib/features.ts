/*
 * Features that can be switched off without removing their code.
 * NEXT_PUBLIC_* values are fixed when the app is built, so the server and the browser always agree.
 */

/** Voice rooms (LiveKit). Off for the CADEV: the Systalink server has 1 vCPU and only ports 22, 80 and 443. */
export const salonsEnabled = process.env.NEXT_PUBLIC_SALONS === "on";

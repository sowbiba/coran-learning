// Vercel project configuration (see https://vercel.com/docs/project-configuration/vercel-ts).
// We declare a minimal config now; rewrites/headers/crons are added as the app grows.

import { type VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  framework: "nextjs",
  buildCommand: "next build",
  installCommand: "npm install",
};

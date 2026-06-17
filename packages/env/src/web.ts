import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  client: {
    NEXT_PUBLIC_AGENT_WS_URL: z.url().default("ws://localhost:4747/ws"),
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
  experimental__runtimeEnv: {
    NEXT_PUBLIC_AGENT_WS_URL: process.env.NEXT_PUBLIC_AGENT_WS_URL,
  },
});

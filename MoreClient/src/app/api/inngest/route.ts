import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";

// Functions are registered here — add imports as each phase builds them
const functions: Parameters<typeof serve>[0]["functions"] = [];

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});

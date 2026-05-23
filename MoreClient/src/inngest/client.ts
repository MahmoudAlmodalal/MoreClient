import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "moreclient",
  eventKey: process.env.INNGEST_EVENT_KEY,
});

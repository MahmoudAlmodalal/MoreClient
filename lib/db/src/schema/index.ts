import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  real,
  jsonb,
  index,
  uniqueIndex,
  vector,
} from "drizzle-orm/pg-core";

// Multi-tenant root. Every other table is scoped by tenant_key.
export const tenants = pgTable(
  "tenants",
  {
    id: serial("id").primaryKey(),
    tenantKey: text("tenant_key").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    plan: text("plan").notNull().default("pro"), // pro | ultra | custom
    status: text("status").notNull().default("active"), // active | inactive
    limitMessages: integer("limit_messages").notNull().default(500),
    usedMessages: integer("used_messages").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("tenants_tenant_key_uq").on(t.tenantKey)],
);

// Operator accounts (dashboard users). One tenant has many users.
export const authUsers = pgTable(
  "auth_users",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name"),
    role: text("role").notNull().default("company"), // admin | company
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("auth_users_email_uq").on(t.email)],
);

// Per-tenant settings (singleton-per-tenant).
export const settings = pgTable(
  "settings",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    companyName: text("company_name").notNull().default(""),
    botName: text("bot_name").notNull().default("Aida"),
    companyLogo: text("company_logo").notNull().default(""),
    botTone: text("bot_tone").notNull().default("friendly"),
    systemPromptExtra: text("system_prompt_extra").notNull().default(""),
    telegramToken: text("telegram_token"),
    isTelegramActive: boolean("is_telegram_active").notNull().default(false),
    twilioSid: text("twilio_sid"),
    twilioToken: text("twilio_token"),
    twilioNumber: text("twilio_number"),
    isWhatsappActive: boolean("is_whatsapp_active").notNull().default(false),
    subscriptionPlan: text("subscription_plan").notNull().default("pro"),
    confidenceThreshold: real("confidence_threshold").notNull().default(0.55),
    purchaseFlowEnabled: boolean("purchase_flow_enabled").notNull().default(false),
    purchaseCollectAddress: boolean("purchase_collect_address").notNull().default(true),
    purchaseCollectQuantity: boolean("purchase_collect_quantity").notNull().default(true),
    purchaseAutoForwardToSupport: boolean("purchase_auto_forward_to_support").notNull().default(true),
    purchaseConfirmationRequired: boolean("purchase_confirmation_required").notNull().default(true),
    purchaseSessionMinutes: integer("purchase_session_minutes").notNull().default(30),
    purchaseCurrencyLabel: text("purchase_currency_label").notNull().default("USD"),
    intentLlmEnabled: boolean("intent_llm_enabled").notNull().default(true),
    intentConfidenceThreshold: real("intent_confidence_threshold").notNull().default(0.6),
    autoHandoffOnComplaint: boolean("auto_handoff_on_complaint").notNull().default(true),
  },
  (t) => [uniqueIndex("settings_tenant_uq").on(t.tenantId)],
);

// Knowledge-base source documents (file upload or learned-from-handoff).
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(), // pdf | docx | xlsx | txt | md | learned
  sizeBytes: integer("size_bytes").notNull().default(0),
  status: text("status").notNull().default("Indexed"), // Processing | Indexed | Error
  source: text("source"), // e.g. "learned-12"
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Chunked + embedded text from documents. Embeddings nullable when LLM keyless.
export const documentChunks = pgTable(
  "document_chunks",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    documentId: integer("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull().default(0),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("document_chunks_tenant_idx").on(t.tenantId),
    index("document_chunks_doc_idx").on(t.documentId),
  ],
);

// End-user chat conversations (one per (tenant, channel, customer_ref)).
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  customerRef: text("customer_ref").notNull(),
  channel: text("channel").notNull().default("web"), // web | telegram | whatsapp
  language: text("language"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // user | assistant | agent
  content: text("content").notNull(),
  confidence: real("confidence"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const handoffs = pgTable("handoffs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(),
  reason: text("reason").notNull(), // low_confidence | complaint | user_requested | support_request
  question: text("question").notNull(),
  status: text("status").notNull().default("pending"), // pending | resolved
  language: text("language").notNull().default("en"),
  unreplied: boolean("unreplied").notNull().default(true),
  deliveryStatus: text("delivery_status").notNull().default("pending"), // pending | delivered | failed
  deliveryAttempts: integer("delivery_attempts").notNull().default(0),
  deliveryDetail: text("delivery_detail"),
  csatScore: integer("csat_score"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  conversationId: integer("conversation_id").references(() => conversations.id, {
    onDelete: "set null",
  }),
  customerRef: text("customer_ref"),
  productName: text("product_name"),
  quantity: integer("quantity"),
  deliveryAddress: text("delivery_address"),
  status: text("status").notNull().default("pending"),
  state: text("state").notNull().default("collecting"),
  orderData: jsonb("order_data").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const learnedAnswers = pgTable("learned_answers", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  sourceHandoffId: integer("source_handoff_id"),
  documentId: integer("document_id").references(() => documents.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Relations (for joined queries).
export const tenantsRelations = relations(tenants, ({ many, one }) => ({
  users: many(authUsers),
  settings: one(settings),
  documents: many(documents),
  conversations: many(conversations),
  handoffs: many(handoffs),
}));

export const conversationsRelations = relations(conversations, ({ many, one }) => ({
  tenant: one(tenants, { fields: [conversations.tenantId], references: [tenants.id] }),
  messages: many(messages),
  handoffs: many(handoffs),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const handoffsRelations = relations(handoffs, ({ one }) => ({
  conversation: one(conversations, {
    fields: [handoffs.conversationId],
    references: [conversations.id],
  }),
  tenant: one(tenants, { fields: [handoffs.tenantId], references: [tenants.id] }),
}));

export const documentsRelations = relations(documents, ({ many }) => ({
  chunks: many(documentChunks),
}));

export const documentChunksRelations = relations(documentChunks, ({ one }) => ({
  document: one(documents, {
    fields: [documentChunks.documentId],
    references: [documents.id],
  }),
}));

export type Tenant = typeof tenants.$inferSelect;
export type AuthUser = typeof authUsers.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type DocumentChunk = typeof documentChunks.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Handoff = typeof handoffs.$inferSelect;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type LearnedAnswer = typeof learnedAnswers.$inferSelect;

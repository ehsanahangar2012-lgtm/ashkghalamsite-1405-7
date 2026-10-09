import { pgTable, serial, text, varchar, timestamp, boolean, jsonb, integer, foreignKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// --- Users & Roles ---
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('editor'), // admin, editor, author, reviewer
  status: varchar('status', { length: 50 }).notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// --- Enterprise Digital Asset Management (DAM) ---
export const media = pgTable('media', {
  id: serial('id').primaryKey(),
  filename: varchar('filename', { length: 255 }).notNull(),
  url: text('url').notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  assetCategory: varchar('asset_category', { length: 100 }).default('image'), // image, video, pdf, artwork, dieline, cad, mockup, brand
  sizeBytes: integer('size_bytes').notNull(),
  altText: text('alt_text'), // AI-assisted generation target
  seoDescription: text('seo_description'), // AI SEO generation
  ocrText: text('ocr_text'), // Intelligent OCR search
  tags: jsonb('tags'), // Array of descriptive tags
  isOptimized: boolean('is_optimized').default(false), // WebP conversion, etc.
  cdnUrl: text('cdn_url'),
  rightsStatus: varchar('rights_status', { length: 50 }).default('internal_only'),
  workflowStatus: varchar('workflow_status', { length: 50 }).default('pending_approval'), // pending, approved, rejected
  version: integer('version').default(1),
  parentAssetId: integer('parent_asset_id'), // For version control linking
  uploadedBy: integer('uploaded_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// --- Dynamic Content Types ---
export const contentTypes = pgTable('content_types', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(), // e.g., 'article', 'landing_page', 'product'
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  schemaDefinition: jsonb('schema_definition').notNull(), // JSON schema for dynamic fields
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Categories & Tags ---
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  parentId: integer('parent_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Content Entries (The Universal Storage Table) ---
export const contentEntries = pgTable('content_entries', {
  id: serial('id').primaryKey(),
  contentTypeId: integer('content_type_id').references(() => contentTypes.id).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  language: varchar('language', { length: 10 }).notNull().default('en'), // Multi-language
  status: varchar('status', { length: 50 }).notNull().default('draft'), // draft, pending_review, approved, published, archived
  authorId: integer('author_id').references(() => users.id).notNull(),
  dynamicData: jsonb('dynamic_data').notNull(), // Storing modular blocks and fields
  seoMetadata: jsonb('seo_metadata'), // AI-assisted metadata target
  publishedAt: timestamp('published_at'), // Scheduled publishing
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// --- Content Versioning & Revision History ---
export const contentRevisions = pgTable('content_revisions', {
  id: serial('id').primaryKey(),
  contentEntryId: integer('content_entry_id').references(() => contentEntries.id).notNull(),
  authorId: integer('author_id').references(() => users.id).notNull(),
  dynamicDataSnapshot: jsonb('dynamic_data_snapshot').notNull(), // Full snapshot of content at this point
  commitMessage: text('commit_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Junction Tables ---
export const contentCategories = pgTable('content_categories', {
  contentId: integer('content_id').references(() => contentEntries.id).notNull(),
  categoryId: integer('category_id').references(() => categories.id).notNull(),
});

export const contentTags = pgTable('content_tags', {
  contentId: integer('content_id').references(() => contentEntries.id).notNull(),
  tagId: integer('tag_id').references(() => tags.id).notNull(),
});

export const contentWorkflows = pgTable('content_workflows', {
  id: serial('id').primaryKey(),
  contentId: integer('content_id').references(() => contentEntries.id).notNull(),
  reviewerId: integer('reviewer_id').references(() => users.id),
  action: varchar('action', { length: 50 }).notNull(), // e.g., 'requested_changes', 'approved'
  comments: text('comments'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Programmatic SEO System ---
export const programmaticTemplates = pgTable('programmatic_templates', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  urlPattern: varchar('url_pattern', { length: 255 }).notNull(), // e.g., /packaging-for-{product}-in-{location}
  variables: jsonb('variables').notNull(), // Lists of values for variables
  basePrompt: text('base_prompt').notNull(), // AI system prompt
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const programmaticPages = pgTable('programmatic_pages', {
  id: serial('id').primaryKey(),
  templateId: integer('template_id').references(() => programmaticTemplates.id).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  variablePermutation: jsonb('variable_permutation').notNull(), // e.g., { product: 'food', location: 'tehran' }
  generatedContent: jsonb('generated_content'), // full page payload (title, content, schema, faqs, images)
  status: varchar('status', { length: 50 }).notNull().default('draft'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relationships definition (for ORM mapping)
export const contentRelations = relations(contentEntries, ({ one, many }) => ({
  author: one(users, { fields: [contentEntries.authorId], references: [users.id] }),
  contentType: one(contentTypes, { fields: [contentEntries.contentTypeId], references: [contentTypes.id] }),
  revisions: many(contentRevisions),
  workflowEvents: many(contentWorkflows),
}));

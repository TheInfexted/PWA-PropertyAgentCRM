import {
  mysqlTable, int, varchar, text, boolean, timestamp,
  mysqlEnum, json, uniqueIndex, index,
} from 'drizzle-orm/mysql-core'
import type { WorkspaceSettings } from '~~/shared/types'

export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 120 }).notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const workspaces = mysqlTable('workspaces', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 160 }).notNull(),
  settings: json('settings').$type<WorkspaceSettings>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const workspaceMembers = mysqlTable('workspace_members', {
  id: int('id').autoincrement().primaryKey(),
  workspaceId: int('workspace_id').notNull(),
  userId: int('user_id').notNull(),
  role: mysqlEnum('role', ['owner', 'agent']).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({ uqMember: uniqueIndex('uq_member').on(t.workspaceId, t.userId) }))

export const statuses = mysqlTable('statuses', {
  id: int('id').autoincrement().primaryKey(),
  workspaceId: int('workspace_id').notNull(),
  label: varchar('label', { length: 80 }).notNull(),
  color: varchar('color', { length: 16 }).notNull().default('#6b7280'),
  sortOrder: int('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({ idxWs: index('idx_status_ws').on(t.workspaceId) }))

export const leads = mysqlTable('leads', {
  id: int('id').autoincrement().primaryKey(),
  workspaceId: int('workspace_id').notNull(),
  name: varchar('name', { length: 200 }).notNull().default(''),
  phoneE164: varchar('phone_e164', { length: 32 }),
  phoneRaw: varchar('phone_raw', { length: 40 }),
  phoneValid: boolean('phone_valid').notNull().default(false),
  area: varchar('area', { length: 120 }).notNull().default(''),
  statusId: int('status_id'),
  remarks: text('remarks'),
  assignedTo: int('assigned_to'),
  source: mysqlEnum('source', ['manual', 'import', 'whatsapp', 'propertyguru', 'iproperty', 'facebook', 'referral', 'walkin']).notNull().default('manual'),
  email: varchar('email', { length: 255 }),
  intent: mysqlEnum('intent', ['buy', 'rent', 'sell', 'invest']),
  propertyType: varchar('property_type', { length: 80 }),
  budgetMin: int('budget_min'),
  budgetMax: int('budget_max'),
  nextFollowUpAt: timestamp('next_follow_up_at'),
  tags: json('tags').$type<string[]>(),
  createdBy: int('created_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  idxWsStatus: index('idx_lead_ws_status').on(t.workspaceId, t.statusId),
  idxWsAssigned: index('idx_lead_ws_assigned').on(t.workspaceId, t.assignedTo),
  idxWsFollow: index('idx_lead_ws_follow').on(t.workspaceId, t.nextFollowUpAt),
  idxWsPhone: index('idx_lead_ws_phone').on(t.workspaceId, t.phoneE164),
}))

export const invites = mysqlTable('invites', {
  id: int('id').autoincrement().primaryKey(),
  workspaceId: int('workspace_id').notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  role: mysqlEnum('role', ['owner', 'agent']).notNull().default('agent'),
  token: varchar('token', { length: 48 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({ idxWsEmail: index('idx_invite_ws_email').on(t.workspaceId, t.email) }))

export const activities = mysqlTable('activities', {
  id: int('id').autoincrement().primaryKey(),
  workspaceId: int('workspace_id').notNull(),
  leadId: int('lead_id').notNull(),
  type: mysqlEnum('type', ['created', 'call', 'whatsapp', 'status_change', 'note', 'assigned', 'imported']).notNull(),
  detail: json('detail').$type<Record<string, unknown>>(),
  actorUserId: int('actor_user_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({ idxWsLead: index('idx_act_ws_lead').on(t.workspaceId, t.leadId, t.createdAt) }))

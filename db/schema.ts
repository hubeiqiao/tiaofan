import { sqliteTable,text,integer,primaryKey } from 'drizzle-orm/sqlite-core';
export const watchlist=sqliteTable('watchlist',{
 userId:text('user_id').notNull(),animeKey:text('anime_key').notNull(),
 payload:text('payload').notNull(),state:text('state').notNull().default('want'),
 favorite:integer('favorite').notNull().default(0),
 updatedAt:integer('updated_at').notNull(),removed:integer('removed').notNull().default(0)
},t=>[primaryKey({columns:[t.userId,t.animeKey]})]);
export const sourceSnapshots=sqliteTable('source_snapshots',{
 key:text('key').primaryKey(),payload:text('payload').notNull(),previousPayload:text('previous_payload'),
 sourceUrl:text('source_url').notNull(),updatedAt:integer('updated_at').notNull(),
 attemptedAt:integer('attempted_at').notNull(),lastError:text('last_error')
});
export const refreshJobs=sqliteTable('refresh_jobs',{
 key:text('key').primaryKey(),startedAt:integer('started_at').notNull(),finishedAt:integer('finished_at'),
 lastSuccessAt:integer('last_success_at'),leaseUntil:integer('lease_until').notNull().default(0),
 runCount:integer('run_count').notNull().default(0),lastError:text('last_error')
});

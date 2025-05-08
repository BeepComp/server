import { relations } from "drizzle-orm";
import { bigint, boolean, integer, pgTable, primaryKey, serial, text, varchar } from "drizzle-orm/pg-core"




//// USERS TABLE

export const users = pgTable('users', {
  id: text('id').primaryKey(), // <- Discord Snowflake ID 
  participant: boolean('participant'),
  // ... I guess the rest of the info is from discord API
});

export const usersRelations = relations(users, ({ many }) => ({
	submissions: many(usersToSubmissions),
  okays: many(usersToOkays, {relationName: "okays"}),
  left_okays: many(okays, {relationName: "left_okays"})
  // bonus_tokens: many(bonus_tokens)
}));




//// SUBMISSIONS TABLE

export const submissions = pgTable('submissions', {
	id: text('id').primaryKey(),
	draft: boolean("draft"),
  title: text("title"),
  link: text("link"),
  player_link: text("player_link"),
  round: integer("round"),
  challengerId: text("challengerId"),
});

export const submissionsRelations = relations(submissions, ({ one, many }) => ({
	authors: many(usersToSubmissions),
  okays: many(okays),
  challenger: one(users, {
    fields: [submissions.challengerId],
    references: [users.id],
    relationName: "challenger"
  }),
}));

export const usersToSubmissions = pgTable(
  'users_to_submissions',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    submissionId: text('submission_id')
      .notNull()
      .references(() => submissions.id),
  },
  (t) => [
		primaryKey({ columns: [t.userId, t.submissionId] })
	],
);

export const usersToSubmissionsRelations = relations(usersToSubmissions, ({ one }) => ({
  submission: one(submissions, {
    fields: [usersToSubmissions.submissionId],
    references: [submissions.id],
  }),
  user: one(users, {
    fields: [usersToSubmissions.userId],
    references: [users.id],
  }),
}));




//// OKAYS TABLE

export const okays = pgTable('okays', {
	id: text('id').primaryKey(),
  submissionId: text("submission_id"),
  sendingId: text("sending_id"),
})

export const okaysRelations = relations(okays, ({ one, many }) => ({
  submission: one(submissions, {
		fields: [okays.submissionId],
		references: [submissions.id],
	}),
  sending: one(users, {
		fields: [okays.sendingId],
		references: [users.id],
    relationName: "left_okays"
	}),
	receiving: many(usersToOkays)
}));

export const usersToOkays = pgTable(
  'users_to_okays',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    okayId: text('okays_id')
      .notNull()
      .references(() => okays.id),
  },
  (t) => [
		primaryKey({ columns: [t.userId, t.okayId] })
	],
);

export const usersToOkaysRelations = relations(usersToOkays, ({ one }) => ({
  submission: one(okays, {
    fields: [usersToOkays.okayId],
    references: [okays.id],
  }),
  user: one(users, {
    fields: [usersToOkays.userId],
    references: [users.id],
  }),
}));
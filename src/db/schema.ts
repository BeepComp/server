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
  left_okays: many(okays, {relationName: "left_okays"}),
  incoming_requests: many(requests, {relationName: "receiving"}),
  outgoing_requests: many(requests, {relationName: "sending"}),
  // bonus_tokens: many(bonus_tokens)
}));




//// MODIFIERS TABLE

export const modifiers = pgTable('modifiers', {
	id: text('id').primaryKey(),
  type: text({enum: ["noun", "verb", "adjective"]}),
  text: text("text"),
  submitter: text("submitter").references(() => users.id, {onDelete: 'cascade'}),
});

export const modifiersRelations = relations(modifiers, ({ many }) => ({
	submissions: many(modifiersToSubmissions),
  requests: many(requests)
  // bonus_tokens: many(bonus_tokens)
}));



//// SUBMISSIONS TABLE

export const submissions = pgTable('submissions', {
	id: text('id').primaryKey(),
	draft: boolean("draft").default(false),
  title: text("title"),
  link: text("link"),
  player_link: text("player_link"),
  desc: text("desc"),
  round: integer("round"),
  challengerId: text("challengerId"),
  submitter: text("submitter").references(() => users.id, {onDelete: 'cascade'})
});

// submissions relations
export const submissionsRelations = relations(submissions, ({ one, many }) => ({
	authors: many(usersToSubmissions),
  okays: many(okays),
  modifiers: many(modifiersToSubmissions),
  challenger: one(users, {
    fields: [submissions.challengerId],
    references: [users.id],
    relationName: "challenger"
  }),
}));

// submissions < - > users
export const usersToSubmissions = pgTable(
  'users_to_submissions',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, {onDelete: 'cascade'}),
    submissionId: text('submission_id')
      .notNull()
      .references(() => submissions.id, {onDelete: 'cascade'}),
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

// submissions < - > modifiers
export const modifiersToSubmissions = pgTable(
  'modifiers_to_submissions',
  {
    modifierId: text('modifier_id')
      .notNull()
      .references(() => modifiers.id, {onDelete: 'cascade'}),
    submissionId: text('submission_id')
      .notNull()
      .references(() => submissions.id, {onDelete: 'cascade'}),
  },
  (t) => [
		primaryKey({ columns: [t.modifierId, t.submissionId] })
	],
);

export const modifiersToSubmissionsRelations = relations(modifiersToSubmissions, ({ one }) => ({
  submission: one(submissions, {
    fields: [modifiersToSubmissions.submissionId],
    references: [submissions.id],
  }),
  modifier: one(modifiers, {
    fields: [modifiersToSubmissions.modifierId],
    references: [modifiers.id],
  }),
}));




//// REQUEST TABLE

export const requests = pgTable('requests', {
	id: text('id').primaryKey(),
	type: text('type', {enum: ["battle", "collab"]}).notNull(),
  submissionId: text("submission_id").references(() => submissions.id, {onDelete: 'cascade'}).notNull(),
  round: integer("round").notNull(),
  sendingId: text("sending_id").references(() => users.id, {onDelete: 'cascade'}).notNull(),
  receivingId: text("receiving_id").references(() => users.id, {onDelete: 'cascade'}).notNull(),
})

// requests relations
export const requestsRelations = relations(requests, ({ one, many }) => ({
	submission: one(submissions, {
    fields: [requests.submissionId],
    references: [submissions.id],
    relationName: "submission"
  }),
	sending: one(users, {
    fields: [requests.sendingId],
    references: [users.id],
    relationName: "sending"
  }),
	receiving: one(users, {
    fields: [requests.receivingId],
    references: [users.id],
    relationName: "receiving"
  })
}));

// // requests < - > users
// export const usersToRequests = pgTable(
//   'users_to_requests',
//   {
//     userId: text('user_id')
//       .notNull()
//       .references(() => users.id, {onDelete: 'cascade'}),
//     requestId: text('request_id')
//       .notNull()
//       .references(() => requests.id, {onDelete: 'cascade'}),
//   },
//   (t) => [
// 		primaryKey({ columns: [t.userId, t.requestId] })
// 	],
// );

// export const usersToRequestsRelations = relations(usersToRequests, ({ one }) => ({
//   requests: one(requests, {
//     fields: [usersToRequests.requestId],
//     references: [requests.id],
//   }),
//   user: one(users, {
//     fields: [usersToRequests.userId],
//     references: [users.id],
//   }),
// }));



//// OKAYS TABLE

export const okays = pgTable('okays', {
	id: text('id').primaryKey(),
  submissionId: text("submission_id"),
  sendingId: text("sending_id"),
})

// submissions relations
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

// okays < - > users
export const usersToOkays = pgTable(
  'users_to_okays',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, {onDelete: 'cascade'}),
    okayId: text('okays_id')
      .notNull()
      .references(() => okays.id, {onDelete: 'cascade'}),
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
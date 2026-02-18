import { Modifier, ModifierDatabased, SubmissionDatabased, Vote, VoteDatabased } from "@beepcomp/core"
import { modifiers, submissions, votes } from "../db/schema"

export function obscureModifier(modifier: (typeof modifiers.$inferSelect)) {
  let cleaned_modifier = (modifier as ModifierDatabased)
  delete cleaned_modifier["submitter"]
  return cleaned_modifier
}

export function obscureVote(vote: (typeof votes.$inferSelect)) {
  let cleaned_vote = (vote as VoteDatabased)
  delete cleaned_vote["sendingId"]
  return cleaned_vote
}

export function obscureSubmission(submission: (typeof submissions.$inferSelect)): SubmissionDatabased {
  let cleaned_submission = (submission as SubmissionDatabased)
  delete cleaned_submission["submitter"]
  delete cleaned_submission["challengerId"]
  delete cleaned_submission["authors"]
  
  // Nesting Obscuring
  if (cleaned_submission.modifiers) {
    cleaned_submission.modifiers.map(entry => {
      if (entry.modifier) { entry.modifier = obscureModifier(entry.modifier as Modifier) }
      return entry
    })
  }
  
  // Nesting Obscuring
  if (cleaned_submission.votes) {
    cleaned_submission.votes.map(entry => {
      return obscureVote(entry as Vote)
    })
  }

  return cleaned_submission
}
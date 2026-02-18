import { SubmissionDatabased } from "@beepcomp/core";
import { votes } from "../db/schema";
import { Global } from "./global";
import { avg } from "../lib/maths";

export function calcPoints(this_submission: SubmissionDatabased, participants: string[] = Global["participants"]) {
  let hcv: number[] = []
  let hav: number[] = []

  let these_votes = (this_submission.votes || [])

  if (these_votes.length == 0) { return 0 }

  // let subIds = new Set()
  these_votes.forEach(vote => {
    let main_cats = [
      vote.composition / 10.0,
      vote.production / 10.0,
      vote.style / 10.0,
      vote.structure / 10.0
    ]

    main_cats = main_cats.sort((a, b) => b - a)
    
    let value = (
      (((main_cats[0] + main_cats[1] + main_cats[2]) / 3.0) * 0.7) +
      (main_cats[3] * 0.05) +
      ((vote.prompt / 10.0) * 0.25)
    )
    if (participants.includes(vote.sendingId || "")) { hcv.push(value) } else { hav.push(value) }
    // subIds.add(vote.submissionId)
  })

  // print(subIds, `HCV COUNT`, hcv.length)

  hcv = hcv.sort((a, b) => b - a)
  hcv = hcv.slice(0, Math.round((hcv.length * 0.7)))
  hav = hav.sort((a, b) => b - a)
  hav = hav.slice(0, Math.round((hav.length * 0.7)))
  
  // print(subIds, `new HCV COUNT`, hcv.length)
  // print("hav", hav, avg(hav))

  let base_score = ((
    ((hcv.length > 0 ? avg(hcv) : avg(hav)) * 0.8) +
    ((hav.length > 0 ? avg(hav) : avg(hcv)) * 0.2)
  ) * 100000)

  return (Math.round(base_score - (this_submission.authors?.length == 2 ? (base_score * 0.01) : 0)) / 100)
}
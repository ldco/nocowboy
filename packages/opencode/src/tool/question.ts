import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { Question } from "../question"
import DESCRIPTION from "./question.txt"
import { KiloQuestionTool } from "@/nocowboy/tool/question"
import { NoCowboySession } from "@/nocowboy/session"

export const Parameters = Schema.Struct({
  questions: Schema.mutable(Schema.Array(Question.Prompt)).annotate({ description: "Questions to ask" }),
})

type Metadata = {
  answers: ReadonlyArray<Question.Answer>
  dismissed?: boolean
}

export const QuestionTool = Tool.define<typeof Parameters, Metadata, Question.Service>(
  "question",
  Effect.gen(function* () {
    const question = yield* Question.Service

    return {
      description: DESCRIPTION,
      parameters: Parameters,
      execute: (params: Schema.Schema.Type<typeof Parameters>, ctx: Tool.Context<Metadata>) =>
        Effect.gen(function* () {
          // A question asks a HUMAN to answer. In a subagent session or an
          // autopilot/roadmap run nobody can answer, so `question.ask` parks
          // forever and freezes the pipeline. Short-circuit instead.
          const noHuman = NoCowboySession.noHumanReason(ctx.sessionID)
          if (noHuman) {
            return {
              title: "Question skipped (no human available)",
              output:
                `The question tool is unavailable here because ${noHuman}. ` +
                `Do NOT ask the user and do NOT wait: make the best decision yourself, ` +
                `continue the task, and report the exact blocker directly if one exists.`,
              metadata: { answers: [], dismissed: true },
            }
          }

          // tool result via KiloQuestionTool helpers, so Effect.orDie below does not turn
          // it into a defect and kill the in-flight stream.
          const answers = yield* question
            .ask({
              sessionID: ctx.sessionID,
              questions: params.questions,
              tool: ctx.callID ? { messageID: ctx.messageID, callID: ctx.callID } : undefined,
            })
            .pipe(KiloQuestionTool.catchDismissed)
          if (KiloQuestionTool.isDismissed(answers)) return KiloQuestionTool.dismissedResult()

          const formatted = params.questions
            .map((q, i) => `"${q.question}"="${answers[i]?.length ? answers[i].join(", ") : "Unanswered"}"`)
            .join(", ")

          return {
            title: `Asked ${params.questions.length} question${params.questions.length > 1 ? "s" : ""}`,
            output: `User has answered your questions: ${formatted}. You can now continue with the user's answers in mind.`,
            metadata: {
              answers,
            },
          }
        }).pipe(Effect.orDie),
    }
  }),
)

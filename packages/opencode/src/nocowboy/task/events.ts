import type { Task, TaskEventKind } from "./schema"

export interface TaskCreated {
  sessionID: string
  task: Task
}

export type UpdatedKind = Exclude<TaskEventKind, "created">

export interface TaskUpdated {
  sessionID: string
  task: Task
  kind: UpdatedKind
}

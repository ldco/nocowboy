/**
 * Agent Teams — multi-agent coordination for autonomous work.
 *
 * Three primitives:
 *   - TeamTaskList: shared task list (file-backed, claimed with locking)
 *   - AgentMailbox: inter-agent message inboxes
 *   - TeamLead: orchestrator that creates teams, breaks down goals, monitors
 *     progress, and coordinates teammates
 *
 * Usage flow:
 *   1. lead.createTeam({ id, name, members })
 *   2. lead.breakDown({ teamID, goal, tasks })
 *   3. each teammate runs lead.workLoop({ teamID, agentID, work })
 *   4. lead.waitForCompletion({ teamID }) → TeamProgress
 */
export { TeamTaskList, type TeamTask, type TeamTaskStatus, type TeamListOptions } from "./task-list"
export { AgentMailbox, type TeamMessage, type TeamMessageType } from "./mailbox"
export {
  TeamLead,
  type TeamMember,
  type TeamConfig,
  type TeamProgress,
} from "./team-lead"

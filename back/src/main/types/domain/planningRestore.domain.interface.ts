export interface PlanningRestoreDomainInterface {
  restore: (activityLogId: string, userID: string) => Promise<void>
}

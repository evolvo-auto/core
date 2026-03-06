-- CreateTable
CREATE TABLE "github_audit_events" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "issue_number" INTEGER,
    "pull_request_number" INTEGER,
    "repository_owner" TEXT NOT NULL,
    "repository_name" TEXT NOT NULL,
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "github_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "github_audit_events_action_idx" ON "github_audit_events"("action");

-- CreateIndex
CREATE INDEX "github_audit_events_issue_number_idx" ON "github_audit_events"("issue_number");

-- CreateIndex
CREATE INDEX "github_audit_events_pull_request_number_idx" ON "github_audit_events"("pull_request_number");

-- CreateIndex
CREATE INDEX "github_audit_events_created_at_idx" ON "github_audit_events"("created_at");

-- CreateIndex
CREATE INDEX "github_audit_events_repository_owner_repository_name_idx" ON "github_audit_events"("repository_owner", "repository_name");

-- AddForeignKey
ALTER TABLE "github_audit_events" ADD CONSTRAINT "github_audit_events_issue_number_fkey" FOREIGN KEY ("issue_number") REFERENCES "issues"("github_issue_number") ON DELETE SET NULL ON UPDATE CASCADE;

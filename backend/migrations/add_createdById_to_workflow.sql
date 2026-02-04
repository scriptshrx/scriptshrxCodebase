-- AlterTable
ALTER TABLE "workflows" ADD COLUMN "createdById" TEXT;

-- CreateIndex
CREATE INDEX "workflows_createdById_idx" ON "workflows"("createdById");

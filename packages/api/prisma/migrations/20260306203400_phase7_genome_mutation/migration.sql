-- CreateTable
CREATE TABLE "prompt_definitions" (
    "id" TEXT NOT NULL,
    "prompt_key" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "response_mode" TEXT NOT NULL,
    "system_prompt" TEXT NOT NULL,
    "sample_user_prompt" TEXT NOT NULL,
    "sample_input_json" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "lineage_parent_id" TEXT,
    "lineage_reason" TEXT,
    "source_mutation_id" TEXT,
    "source_fingerprint" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prompt_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prompt_definitions_prompt_key_is_active_idx" ON "prompt_definitions"("prompt_key", "is_active");

-- CreateIndex
CREATE INDEX "prompt_definitions_role_idx" ON "prompt_definitions"("role");

-- CreateIndex
CREATE INDEX "prompt_definitions_source_mutation_id_idx" ON "prompt_definitions"("source_mutation_id");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_definitions_prompt_key_version_key" ON "prompt_definitions"("prompt_key", "version");

-- AddForeignKey
ALTER TABLE "prompt_definitions" ADD CONSTRAINT "prompt_definitions_source_mutation_id_fkey" FOREIGN KEY ("source_mutation_id") REFERENCES "mutation_proposals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_definitions" ADD CONSTRAINT "prompt_definitions_lineage_parent_id_fkey" FOREIGN KEY ("lineage_parent_id") REFERENCES "prompt_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

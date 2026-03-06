'use server';

import { getPrismaClient } from './client.ts';
import {
  Prisma
} from './generated/prisma/client.ts';
import type {
  $Enums,
  ChallengeRecord,
  PrismaClient
} from './generated/prisma/client.ts';

export type UpsertChallengeRecordInput = {
  artifactExpectationsJson?: Prisma.InputJsonValue | null;
  capabilityTags?: string[];
  category: $Enums.ChallengeCategory;
  constraintsJson?: Prisma.InputJsonValue | null;
  intent: string;
  issueSource: $Enums.IssueSource;
  scoringNotesJson?: Prisma.InputJsonValue | null;
  sourceFingerprint: string;
  sourceIssueNumber: number;
  successSignal?: string | null;
  title: string;
  validationStepsJson?: Prisma.InputJsonValue | null;
};

export type UpdateChallengeRecordInput = {
  artifactExpectationsJson?: Prisma.InputJsonValue | null;
  capabilityTags?: string[];
  category?: $Enums.ChallengeCategory;
  constraintsJson?: Prisma.InputJsonValue | null;
  intent?: string;
  issueSource?: $Enums.IssueSource;
  scoringNotesJson?: Prisma.InputJsonValue | null;
  sourceFingerprint?: string;
  sourceIssueNumber: number;
  successSignal?: string | null;
  title?: string;
  validationStepsJson?: Prisma.InputJsonValue | null;
};

export type ListChallengeRecordsOptions = {
  category?: $Enums.ChallengeCategory;
  issueSource?: $Enums.IssueSource;
  limit?: number;
  sourceIssueNumber?: number;
};

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`Challenge record ${fieldName} is required.`);
  }

  return normalizedValue;
}

function normalizeOptionalText(
  value: string | null | undefined
): string | null | undefined {
  if (value === null || value === undefined) {
    return value;
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  return normalizedValue;
}

function normalizeIssueNumber(issueNumber: number): number {
  if (!Number.isInteger(issueNumber) || issueNumber <= 0) {
    throw new Error('Challenge record sourceIssueNumber must be a positive integer.');
  }

  return issueNumber;
}

function normalizeCapabilityTags(capabilityTags: string[] | undefined): string[] {
  if (!capabilityTags) {
    return [];
  }

  const normalizedTags: string[] = [];
  const seenTags = new Set<string>();

  for (const capabilityTag of capabilityTags) {
    const normalizedTag = normalizeOptionalText(capabilityTag)?.toLowerCase();

    if (!normalizedTag || seenTags.has(normalizedTag)) {
      continue;
    }

    seenTags.add(normalizedTag);
    normalizedTags.push(normalizedTag);
  }

  return normalizedTags;
}

function buildChallengeCreateInput(input: UpsertChallengeRecordInput) {
  return {
    artifactExpectationsJson: input.artifactExpectationsJson ?? undefined,
    capabilityTags: normalizeCapabilityTags(input.capabilityTags),
    category: input.category,
    constraintsJson: input.constraintsJson ?? undefined,
    intent: normalizeRequiredText(input.intent, 'intent'),
    issueSource: input.issueSource,
    scoringNotesJson: input.scoringNotesJson ?? undefined,
    sourceFingerprint: normalizeRequiredText(
      input.sourceFingerprint,
      'sourceFingerprint'
    ),
    sourceIssueNumber: normalizeIssueNumber(input.sourceIssueNumber),
    successSignal: normalizeOptionalText(input.successSignal) ?? null,
    title: normalizeRequiredText(input.title, 'title'),
    validationStepsJson: input.validationStepsJson ?? undefined
  } satisfies Prisma.ChallengeRecordUncheckedCreateInput;
}

// POST
export async function upsertChallengeRecord(
  input: UpsertChallengeRecordInput,
  prisma: PrismaClient = getPrismaClient()
): Promise<ChallengeRecord> {
  const data = buildChallengeCreateInput(input);

  return prisma.challengeRecord.upsert({
    create: data,
    update: {
      artifactExpectationsJson: data.artifactExpectationsJson,
      capabilityTags: data.capabilityTags,
      category: data.category,
      constraintsJson: data.constraintsJson,
      intent: data.intent,
      issueSource: data.issueSource,
      scoringNotesJson: data.scoringNotesJson,
      sourceFingerprint: data.sourceFingerprint,
      successSignal: data.successSignal,
      title: data.title,
      validationStepsJson: data.validationStepsJson
    },
    where: {
      sourceIssueNumber: data.sourceIssueNumber
    }
  });
}

// POST
export async function updateChallengeRecord(
  input: UpdateChallengeRecordInput,
  prisma: PrismaClient = getPrismaClient()
): Promise<ChallengeRecord> {
  const data: Prisma.ChallengeRecordUncheckedUpdateInput = {};

  if (input.artifactExpectationsJson !== undefined) {
    data.artifactExpectationsJson =
      input.artifactExpectationsJson === null
        ? Prisma.JsonNull
        : input.artifactExpectationsJson;
  }

  if (input.capabilityTags !== undefined) {
    data.capabilityTags = normalizeCapabilityTags(input.capabilityTags);
  }

  if (input.category !== undefined) {
    data.category = input.category;
  }

  if (input.constraintsJson !== undefined) {
    data.constraintsJson =
      input.constraintsJson === null ? Prisma.JsonNull : input.constraintsJson;
  }

  if (input.intent !== undefined) {
    data.intent = normalizeRequiredText(input.intent, 'intent');
  }

  if (input.issueSource !== undefined) {
    data.issueSource = input.issueSource;
  }

  if (input.scoringNotesJson !== undefined) {
    data.scoringNotesJson =
      input.scoringNotesJson === null
        ? Prisma.JsonNull
        : input.scoringNotesJson;
  }

  if (input.sourceFingerprint !== undefined) {
    data.sourceFingerprint = normalizeRequiredText(
      input.sourceFingerprint,
      'sourceFingerprint'
    );
  }

  if (input.successSignal !== undefined) {
    data.successSignal = normalizeOptionalText(input.successSignal) ?? null;
  }

  if (input.title !== undefined) {
    data.title = normalizeRequiredText(input.title, 'title');
  }

  if (input.validationStepsJson !== undefined) {
    data.validationStepsJson =
      input.validationStepsJson === null
        ? Prisma.JsonNull
        : input.validationStepsJson;
  }

  if (Object.keys(data).length === 0) {
    throw new Error('Challenge record update requires at least one mutable field.');
  }

  return prisma.challengeRecord.update({
    data,
    where: {
      sourceIssueNumber: normalizeIssueNumber(input.sourceIssueNumber)
    }
  });
}

// GET
export async function getChallengeRecordBySourceIssueNumber(
  sourceIssueNumber: number,
  prisma: PrismaClient = getPrismaClient()
): Promise<ChallengeRecord | null> {
  return prisma.challengeRecord.findUnique({
    where: {
      sourceIssueNumber: normalizeIssueNumber(sourceIssueNumber)
    }
  });
}

// GET
export async function listChallengeRecords(
  options: ListChallengeRecordsOptions = {},
  prisma: PrismaClient = getPrismaClient()
): Promise<ChallengeRecord[]> {
  const limit = Math.max(1, Math.floor(options.limit ?? 100));

  return prisma.challengeRecord.findMany({
    orderBy: [
      {
        updatedAt: 'desc'
      },
      {
        sourceIssueNumber: 'desc'
      }
    ],
    take: limit,
    where: {
      category: options.category,
      issueSource: options.issueSource,
      sourceIssueNumber:
        options.sourceIssueNumber === undefined
          ? undefined
          : normalizeIssueNumber(options.sourceIssueNumber)
    }
  });
}

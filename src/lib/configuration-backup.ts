import { z } from "zod";
import { createUuid } from "./uuid";
import type { Game, GameDraft } from "../shared/models";
import { assignmentOptionColorSchema } from "../shared/option-colors";

export const CONFIGURATION_BACKUP_FORMAT = "bg-assistant-configuration";
export const CONFIGURATION_BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
export const MAX_BACKUP_GAMES = 50;

const portableOptionSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional(),
  color: assignmentOptionColorSchema.optional(),
  quantity: z.number().int().min(1).max(99)
}).strict();

const portableSetSchema = z.object({
  name: z.string().trim().min(1).max(60),
  options: z.array(portableOptionSchema).max(100)
}).strict();

const portableRestrictionSchema = z.object({
  optionA: z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()]),
  optionB: z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()])
}).strict();

const portableGameSchema = z.object({
  name: z.string().trim().min(1).max(100),
  assignmentSets: z.array(portableSetSchema).min(1).max(20),
  bannedCombinations: z.array(portableRestrictionSchema).max(200)
}).strict().superRefine((game, context) => {
  for (const [index, restriction] of game.bannedCombinations.entries()) {
    const [setA, optionA] = restriction.optionA;
    const [setB, optionB] = restriction.optionB;
    if (
      setA === setB ||
      !game.assignmentSets[setA]?.options[optionA] ||
      !game.assignmentSets[setB]?.options[optionB]
    ) {
      context.addIssue({
        code: "custom",
        path: ["bannedCombinations", index],
        message: "A restriction must connect existing options from different sets"
      });
    }
  }
});

const backupSchema = z.object({
  format: z.literal(CONFIGURATION_BACKUP_FORMAT),
  version: z.literal(CONFIGURATION_BACKUP_VERSION),
  exportedAt: z.string().datetime(),
  games: z.array(portableGameSchema).min(1).max(MAX_BACKUP_GAMES)
}).strict();

export type ConfigurationBackup = z.infer<typeof backupSchema>;

const forbiddenKeys = new Set([
  "capability",
  "capabilityToken",
  "groupId",
  "players",
  "playerNames",
  "roster",
  "selected",
  "selections",
  "exclusions",
  "assignments",
  "results",
  "fetchedAt",
  "cachedAt"
]);

function containsForbiddenKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsForbiddenKey);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(
    ([key, child]) => forbiddenKeys.has(key) || containsForbiddenKey(child)
  );
}

export class ConfigurationBackupError extends Error {}

export function createConfigurationBackup(games: Game[], exportedAt = new Date()): ConfigurationBackup {
  if (games.length < 1 || games.length > MAX_BACKUP_GAMES) {
    throw new ConfigurationBackupError(
      `Choose between 1 and ${MAX_BACKUP_GAMES} games for each backup file.`
    );
  }
  return {
    format: CONFIGURATION_BACKUP_FORMAT,
    version: CONFIGURATION_BACKUP_VERSION,
    exportedAt: exportedAt.toISOString(),
    games: games.map((game) => {
      const locationByOptionId = new Map<string, [number, number]>();
      game.assignmentSets.forEach((set, setIndex) => {
        set.options.forEach((option, optionIndex) => {
          locationByOptionId.set(option.id, [setIndex, optionIndex]);
        });
      });
      return {
        name: game.name,
        assignmentSets: game.assignmentSets.map((set) => ({
          name: set.name,
          options: set.options.map((option) => ({
            name: option.name,
            ...(option.description ? { description: option.description } : {}),
            ...(option.color ? { color: option.color } : {}),
            quantity: option.quantity
          }))
        })),
        bannedCombinations: game.bannedCombinations.map((restriction) => ({
          optionA: locationByOptionId.get(restriction.optionAId)!,
          optionB: locationByOptionId.get(restriction.optionBId)!
        }))
      };
    })
  };
}

export function serializeConfigurationBackup(games: Game[]): string {
  const text = JSON.stringify(createConfigurationBackup(games), null, 2);
  if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES) {
    throw new ConfigurationBackupError(
      "This selection is larger than the 5 MB backup limit. Export fewer games at a time."
    );
  }
  return text;
}

export function parseConfigurationBackup(text: string): ConfigurationBackup {
  if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES) {
    throw new ConfigurationBackupError("This backup is larger than the 5 MB import limit.");
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new ConfigurationBackupError("This file is not valid JSON.");
  }
  if (containsForbiddenKey(value)) {
    throw new ConfigurationBackupError(
      "This file contains player, session, group-link, or cache data. Configuration imports must contain game setup only."
    );
  }
  const parsed = backupSchema.safeParse(value);
  if (!parsed.success) {
    const version = typeof value === "object" && value && "version" in value ? value.version : undefined;
    if (version !== CONFIGURATION_BACKUP_VERSION) {
      throw new ConfigurationBackupError(
        `This backup version is not supported. Game Night currently imports version ${CONFIGURATION_BACKUP_VERSION}.`
      );
    }
    throw new ConfigurationBackupError(
      "This backup does not match the supported game-configuration format or exceeds its item limits."
    );
  }
  return parsed.data;
}

export function createImportedDrafts(
  backup: ConfigurationBackup,
  existingNames: string[]
): GameDraft[] {
  const usedNames = new Set(existingNames.map((name) => name.toLocaleLowerCase()));
  return backup.games.map((game) => {
    const name = uniqueImportName(game.name, usedNames);
    usedNames.add(name.toLocaleLowerCase());
    const assignmentSets = game.assignmentSets.map((set) => ({
      id: createUuid(),
      name: set.name,
      options: set.options.map((option) => ({
        id: createUuid(),
        name: option.name,
        description: option.description ?? "",
        ...(option.color ? { color: option.color } : {}),
        quantity: option.quantity
      }))
    }));
    return {
      name,
      assignmentSets,
      bannedCombinations: game.bannedCombinations.map((restriction) => ({
        id: createUuid(),
        optionAId: assignmentSets[restriction.optionA[0]]!.options[restriction.optionA[1]]!.id,
        optionBId: assignmentSets[restriction.optionB[0]]!.options[restriction.optionB[1]]!.id
      }))
    };
  });
}

function uniqueImportName(original: string, usedNames: Set<string>): string {
  if (!usedNames.has(original.toLocaleLowerCase())) return original;
  const suffix = " (imported)";
  const base = original.slice(0, 100 - suffix.length).trimEnd();
  let candidate = `${base}${suffix}`;
  let sequence = 2;
  while (usedNames.has(candidate.toLocaleLowerCase())) {
    const numberedSuffix = ` (imported ${sequence})`;
    candidate = `${original.slice(0, 100 - numberedSuffix.length).trimEnd()}${numberedSuffix}`;
    sequence += 1;
  }
  return candidate;
}

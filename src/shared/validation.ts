import { z } from "zod";

const cleanText = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required`).max(max);

export const groupNameSchema = cleanText("Group name", 80);

export const assignmentOptionSchema = z.object({
  id: z.string().uuid(),
  name: cleanText("Option name", 80),
  quantity: z.number().int().min(1).max(99)
}).strict();

export const assignmentSetSchema = z.object({
  id: z.string().uuid(),
  name: cleanText("Assignment set name", 60),
  options: z.array(assignmentOptionSchema).max(100)
}).strict();

export const bannedCombinationSchema = z.object({
  id: z.string().uuid(),
  optionAId: z.string().uuid(),
  optionBId: z.string().uuid()
}).strict().refine((rule) => rule.optionAId !== rule.optionBId, {
  message: "A restriction must use two different options"
});

export const gameDraftSchema = z.object({
  id: z.string().uuid().optional(),
  name: cleanText("Game name", 100),
  revision: z.number().int().positive().optional(),
  assignmentSets: z.array(assignmentSetSchema).min(1).max(20),
  bannedCombinations: z.array(bannedCombinationSchema).max(200)
}).strict().superRefine((game, context) => {
  const setByOption = new Map<string, string>();
  for (const set of game.assignmentSets) {
    for (const option of set.options) {
      if (setByOption.has(option.id)) {
        context.addIssue({ code: "custom", message: "Option IDs must be unique" });
      }
      setByOption.set(option.id, set.id);
    }
  }
  for (const restriction of game.bannedCombinations) {
    const setA = setByOption.get(restriction.optionAId);
    const setB = setByOption.get(restriction.optionBId);
    if (!setA || !setB || setA === setB) {
      context.addIssue({
        code: "custom",
        message: "Restrictions must connect existing options from different sets"
      });
    }
  }
});

export const createGroupSchema = z.object({ name: groupNameSchema }).strict();
export const renameGroupSchema = z.object({
  name: groupNameSchema,
  revision: z.number().int().positive()
}).strict();

export const capabilitySchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/, "Invalid group link");


import { Hono, type Context } from "hono";
import {
  createGroupSchema,
  gameDraftSchema,
  capabilitySchema,
  renameGroupSchema
} from "../src/shared/validation";
import { generateCapability, hashCapability } from "./capability";
import {
  createGroupRecord,
  findGroupByHash,
  loadSnapshot,
  renameGroup,
  saveGameAggregate,
  setGameDeleted
} from "./db";

interface Env {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>();
const requestBuckets = new Map<string, { count: number; resetAt: number }>();

app.use("/api/*", async (context, next) => {
  const contentLength = Number(context.req.header("content-length") ?? 0);
  if (contentLength > 64 * 1024) return fail(context, 413, "REQUEST_TOO_LARGE", "Request is too large.");
  if (context.req.method !== "GET") {
    const ip = context.req.header("cf-connecting-ip") ?? "local";
    const strict = context.req.path === "/api/groups";
    const limit = strict ? 10 : 60;
    const windowMs = strict ? 60 * 60 * 1000 : 60 * 1000;
    const key = `${strict ? "create" : "write"}:${ip}`;
    const now = Date.now();
    const bucket = requestBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      requestBuckets.set(key, { count: 1, resetAt: now + windowMs });
    } else if (bucket.count >= limit) {
      return fail(context, 429, "RATE_LIMITED", "Please wait before trying again.");
    } else {
      bucket.count += 1;
    }
  }
  await next();
});

app.post("/api/groups", async (context) => {
  const parsed = createGroupSchema.safeParse(await safeJson(context));
  if (!parsed.success) return validationFailure(context, parsed.error);
  const capability = generateCapability();
  const group = await createGroupRecord(
    context.env.DB,
    await hashCapability(capability),
    parsed.data.name
  );
  const result = await loadSnapshot(context.env.DB, group);
  return context.json({ ...result, capability }, 201);
});

app.get("/api/groups/:capability", async (context) => {
  const resolved = await resolveGroup(context);
  if (resolved instanceof Response) return resolved;
  return context.json(await loadSnapshot(context.env.DB, resolved));
});

app.patch("/api/groups/:capability", async (context) => {
  const group = await resolveGroup(context);
  if (group instanceof Response) return group;
  const parsed = renameGroupSchema.safeParse(await safeJson(context));
  if (!parsed.success) return validationFailure(context, parsed.error);
  const outcome = await renameGroup(
    context.env.DB,
    group.id,
    parsed.data.name,
    parsed.data.revision
  );
  if (outcome === "conflict") return conflict(context);
  const refreshed = await findGroupByHash(
    context.env.DB,
    await hashCapability(context.req.param("capability") ?? "")
  );
  return context.json(await loadSnapshot(context.env.DB, refreshed!));
});

app.post("/api/groups/:capability/games", async (context) => {
  const group = await resolveGroup(context);
  if (group instanceof Response) return group;
  const parsed = gameDraftSchema.safeParse(await safeJson(context));
  if (!parsed.success) return validationFailure(context, parsed.error);
  await saveGameAggregate(context.env.DB, group.id, parsed.data);
  return context.json(await loadSnapshot(context.env.DB, group), 201);
});

app.put("/api/groups/:capability/games/:gameId", async (context) => {
  const group = await resolveGroup(context);
  if (group instanceof Response) return group;
  const parsed = gameDraftSchema.safeParse(await safeJson(context));
  if (!parsed.success) return validationFailure(context, parsed.error);
  const outcome = await saveGameAggregate(
    context.env.DB,
    group.id,
    parsed.data,
    context.req.param("gameId")
  );
  if (outcome === "conflict") return conflict(context);
  return context.json(await loadSnapshot(context.env.DB, group));
});

app.delete("/api/groups/:capability/games/:gameId", async (context) => {
  return mutateDeletion(context, false);
});

app.post("/api/groups/:capability/games/:gameId/restore", async (context) => {
  return mutateDeletion(context, true);
});

app.notFound((context) => fail(context, 404, "NOT_FOUND", "That resource was not found."));
app.onError((_error, context) =>
  fail(context, 500, "INTERNAL_ERROR", "Something went wrong. Please try again.")
);

type AppContext = Context<{ Bindings: Env }>;

async function mutateDeletion(context: AppContext, restore: boolean) {
  const group = await resolveGroup(context);
  if (group instanceof Response) return group;
  const body = await safeJson(context);
  const revision = typeof body === "object" && body && "revision" in body ? body.revision : null;
  if (!Number.isInteger(revision) || Number(revision) < 1) {
    return fail(context, 422, "VALIDATION_ERROR", "A valid revision is required.");
  }
  const outcome = await setGameDeleted(
    context.env.DB,
    group.id,
    context.req.param("gameId") ?? "",
    Number(revision),
    restore
  );
  if (outcome === "conflict") return conflict(context);
  return context.json(await loadSnapshot(context.env.DB, group));
}

async function resolveGroup(context: AppContext) {
  const token = context.req.param("capability") ?? "";
  if (!capabilitySchema.safeParse(token).success) {
    return new Response(
      JSON.stringify({ error: { code: "NOT_FOUND", message: "That group was not found." } }),
      { status: 404, headers: { "content-type": "application/json" } }
    );
  }
  const group = await findGroupByHash(context.env.DB, await hashCapability(token));
  if (!group) {
    return new Response(
      JSON.stringify({ error: { code: "NOT_FOUND", message: "That group was not found." } }),
      { status: 404, headers: { "content-type": "application/json" } }
    );
  }
  return group;
}

async function safeJson(context: { req: { json(): Promise<unknown> } }): Promise<unknown> {
  try {
    return await context.req.json();
  } catch {
    return null;
  }
}

function validationFailure(context: any, error: { flatten(): unknown }) {
  return context.json(
    { error: { code: "VALIDATION_ERROR", message: "Check the highlighted information.", details: error.flatten() } },
    422
  );
}

function conflict(context: any) {
  return fail(
    context,
    409,
    "REVISION_CONFLICT",
    "This game changed on another device while you were editing. Reload the latest version."
  );
}

function fail(context: any, status: number, code: string, message: string) {
  return context.json({ error: { code, message } }, status);
}

export default app;

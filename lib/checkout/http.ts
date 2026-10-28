import { CheckoutError, type Surface } from "./types";

export const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

export function parseSurface(value: unknown): Surface {
  if (value === undefined || value === null) return "api";
  if (value === "web" || value === "mobile" || value === "api") return value;
  throw new CheckoutError(
    "INVALID_REQUEST",
    "surface must be web, mobile, or api.",
    400,
  );
}

export function jsonError(error: unknown) {
  if (error instanceof CheckoutError) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status, headers: noStoreHeaders },
    );
  }

  console.error(error);
  return Response.json(
    { error: { code: "INTERNAL_ERROR", message: "Something went wrong." } },
    { status: 500, headers: noStoreHeaders },
  );
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch {
    throw new CheckoutError("INVALID_REQUEST", "A JSON object is required.", 400);
  }
}

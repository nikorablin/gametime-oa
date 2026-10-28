import { jsonError, noStoreHeaders, parseSurface, readJson } from "./http";
import { CheckoutService, checkoutService } from "./service";
import { CheckoutError } from "./types";

export function createCheckoutApi(service: CheckoutService) {
  return {
    async createSession(request: Request) {
      try {
        const body = await readJson(request);
        if (typeof body.listingId !== "string" || !body.listingId.trim()) {
          throw new CheckoutError("INVALID_REQUEST", "listingId is required.", 400);
        }

        const session = service.create(body.listingId, parseSurface(body.surface));
        return Response.json(session, {
          status: 201,
          headers: { ...noStoreHeaders, Location: session.links.web },
        });
      } catch (error) {
        return jsonError(error);
      }
    },

    async resumeSession(request: Request, token: string) {
      try {
        const surface = parseSurface(new URL(request.url).searchParams.get("surface"));
        return Response.json(service.resume(token, surface), {
          headers: noStoreHeaders,
        });
      } catch (error) {
        return jsonError(error);
      }
    },

    async acceptPrice(request: Request, token: string) {
      try {
        const body = await readJson(request);
        const priceVersion = body.priceVersion;
        if (
          typeof priceVersion !== "number" ||
          !Number.isInteger(priceVersion) ||
          priceVersion < 1
        ) {
          throw new CheckoutError(
            "INVALID_REQUEST",
            "priceVersion must be a positive integer.",
            400,
          );
        }
        return Response.json(
          service.acceptPrice(token, priceVersion, parseSurface(body.surface)),
          { headers: noStoreHeaders },
        );
      } catch (error) {
        return jsonError(error);
      }
    },

    async completeSession(request: Request, token: string) {
      try {
        const body = await readJson(request);
        return Response.json(
          await service.complete(
            token,
            request.headers.get("Idempotency-Key") ?? "",
            parseSurface(body.surface),
          ),
          { headers: noStoreHeaders },
        );
      } catch (error) {
        return jsonError(error);
      }
    },

    async changePrice(request: Request, token: string) {
      try {
        const body = await readJson(request);
        const delta = body.delta ?? 15;
        if (typeof delta !== "number" || !Number.isFinite(delta) || delta === 0) {
          throw new CheckoutError(
            "INVALID_REQUEST",
            "delta must be a non-zero number.",
            400,
          );
        }
        return Response.json(service.changePrice(token, delta), {
          headers: noStoreHeaders,
        });
      } catch (error) {
        return jsonError(error);
      }
    },

    async expireSession(token: string) {
      try {
        return Response.json(service.expire(token), { headers: noStoreHeaders });
      } catch (error) {
        return jsonError(error);
      }
    },

    async getAnalytics(token: string) {
      try {
        return Response.json(service.analytics(token), { headers: noStoreHeaders });
      } catch (error) {
        return jsonError(error);
      }
    },
  };
}

export const checkoutApi = createCheckoutApi(checkoutService);

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CheckoutView } from "./types";

export const checkoutQueryKey = (token: string) => ["checkout-session", token] as const;

interface ErrorBody {
  error?: { code?: string; message?: string };
}

export class CheckoutClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

async function readCheckoutResponse(response: Response) {
  const body = (await response.json()) as CheckoutView | ErrorBody;
  if (!response.ok) {
    const error = (body as ErrorBody).error;
    throw new CheckoutClientError(
      error?.message ?? "Checkout could not be updated.",
      response.status,
      error?.code,
    );
  }
  return body as CheckoutView;
}

export function useCheckoutSession(token: string, initialData: CheckoutView) {
  return useQuery({
    queryKey: checkoutQueryKey(token),
    queryFn: async () =>
      readCheckoutResponse(
        await fetch(`/api/checkout-sessions/${token}?surface=web&poll=true`, {
          cache: "no-store",
        }),
      ),
    initialData,
    staleTime: 0,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "COMPLETED" || status === "EXPIRED" ? false : 4000;
    },
    retry: (failureCount, error) =>
      error instanceof CheckoutClientError && error.status >= 500 && failureCount < 1,
  });
}

export function useAcceptPrice(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (priceVersion: number) =>
      readCheckoutResponse(
        await fetch(`/api/checkout-sessions/${token}/price-acceptance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priceVersion, surface: "web" }),
        }),
      ),
    onSuccess: (session) => queryClient.setQueryData(checkoutQueryKey(token), session),
  });
}

export function useCompleteCheckout(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (idempotencyKey: string) =>
      readCheckoutResponse(
        await fetch(`/api/checkout-sessions/${token}/complete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({ surface: "web" }),
        }),
      ),
    onSuccess: (session) => queryClient.setQueryData(checkoutQueryKey(token), session),
  });
}

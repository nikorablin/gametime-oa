"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CheckoutView, Surface } from "./types";

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

export function useCreateCheckout() {
  return useMutation({
    mutationFn: async (listingId: string) =>
      readCheckoutResponse(
        await fetch("/api/checkout-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId, surface: "web" }),
        }),
      ),
  });
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

export function useCheckoutSession(
  token: string,
  initialData: CheckoutView,
  surface: Surface,
) {
  return useQuery({
    queryKey: checkoutQueryKey(token),
    queryFn: async () =>
      readCheckoutResponse(
        await fetch(`/api/checkout-sessions/${token}?surface=${surface}&poll=true`, {
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

export function useAcceptPrice(token: string, surface: Surface) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (priceVersion: number) =>
      readCheckoutResponse(
        await fetch(`/api/checkout-sessions/${token}/price-acceptance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priceVersion, surface }),
        }),
      ),
    onSuccess: (session) => queryClient.setQueryData(checkoutQueryKey(token), session),
  });
}

export function useCompleteCheckout(token: string, surface: Surface) {
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
          body: JSON.stringify({ surface }),
        }),
      ),
    onSuccess: (session) => queryClient.setQueryData(checkoutQueryKey(token), session),
  });
}

export function useChangePrice(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (delta: number) =>
      readCheckoutResponse(
        await fetch(`/api/demo/checkout-sessions/${token}/price`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ delta }),
        }),
      ),
    onSuccess: (session) => queryClient.setQueryData(checkoutQueryKey(token), session),
  });
}

export function useExpireCheckout(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      readCheckoutResponse(
        await fetch(`/api/demo/checkout-sessions/${token}/expire`, { method: "POST" }),
      ),
    onSuccess: (session) => queryClient.setQueryData(checkoutQueryKey(token), session),
  });
}

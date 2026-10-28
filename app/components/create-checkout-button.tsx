"use client";

import { Button } from "@heroui/react";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CheckoutView } from "@/lib/checkout/types";

export function CreateCheckoutButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string>();

  async function createCheckout() {
    setIsCreating(true);
    setError(undefined);
    try {
      const response = await fetch("/api/checkout-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, surface: "web" }),
      });
      if (!response.ok) throw new Error("Checkout could not be started.");
      const session = (await response.json()) as CheckoutView;
      router.push(session.links.web);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Checkout could not be started.");
      setIsCreating(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        variant="primary"
        size="lg"
        fullWidth
        isDisabled={isCreating}
        onPress={createCheckout}
      >
        {isCreating ? "Reserving your tickets…" : "Continue to checkout"}
        {!isCreating && <ArrowRight aria-hidden="true" className="size-4" />}
      </Button>
      {error && (
        <p role="alert" className="text-center text-sm font-medium text-red-700">
          {error} Try again.
        </p>
      )}
    </div>
  );
}

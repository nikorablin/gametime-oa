"use client";

import { Button } from "@heroui/react";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCreateCheckout } from "@/lib/checkout/client";

export function CreateCheckoutButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const createCheckout = useCreateCheckout();

  function startCheckout() {
    createCheckout.mutate(listingId, {
      onSuccess: (session) => router.push(session.links.web),
    });
  }

  return (
    <div className="space-y-2">
      <Button
        variant="primary"
        size="lg"
        fullWidth
        isDisabled={createCheckout.isPending}
        onPress={startCheckout}
      >
        {createCheckout.isPending ? "Reserving your tickets…" : "Continue to checkout"}
        {!createCheckout.isPending && <ArrowRight aria-hidden="true" className="size-4" />}
      </Button>
      {createCheckout.error && (
        <p role="alert" className="text-center text-sm font-medium text-red-700">
          {createCheckout.error.message} Try again.
        </p>
      )}
    </div>
  );
}

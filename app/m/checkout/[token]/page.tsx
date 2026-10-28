import { notFound } from "next/navigation";
import { connection } from "next/server";
import { checkoutService } from "@/lib/checkout/service";
import { CheckoutError, type CheckoutView } from "@/lib/checkout/types";
import { MobileCheckoutView } from "./mobile-checkout-view";

export default async function MobileCheckoutPage({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  let session: CheckoutView;
  try {
    session = checkoutService.resume(token, "mobile");
  } catch (error) {
    if (error instanceof CheckoutError && error.code === "SESSION_NOT_FOUND") notFound();
    throw error;
  }
  return <MobileCheckoutView token={token} initialSession={session} />;
}

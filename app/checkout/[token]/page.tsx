import { connection } from "next/server";
import { notFound } from "next/navigation";
import { checkoutService } from "@/lib/checkout/service";
import { CheckoutError, type CheckoutView as CheckoutViewModel } from "@/lib/checkout/types";
import { CheckoutView } from "./checkout-view";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await connection();
  const { token } = await params;
  let session: CheckoutViewModel;

  try {
    session = checkoutService.resume(token, "web");
  } catch (error) {
    if (error instanceof CheckoutError && error.code === "SESSION_NOT_FOUND") notFound();
    throw error;
  }

  return <CheckoutView token={token} initialSession={session} />;
}

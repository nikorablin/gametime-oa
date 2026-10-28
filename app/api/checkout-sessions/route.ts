import { checkoutApi } from "@/lib/checkout/api";

export async function POST(request: Request) {
  return checkoutApi.createSession(request);
}

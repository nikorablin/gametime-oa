import { checkoutApi } from "@/lib/checkout/api";

interface Context {
  params: Promise<{ token: string }>;
}

export async function POST(_request: Request, context: Context) {
  const { token } = await context.params;
  return checkoutApi.expireSession(token);
}

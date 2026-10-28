import { checkoutApi } from "@/lib/checkout/api";

interface Context {
  params: Promise<{ token: string }>;
}

export async function POST(request: Request, context: Context) {
  const { token } = await context.params;
  return checkoutApi.acceptPrice(request, token);
}

import "server-only";
import { z } from "zod";

export async function paystackRequest(path: string, body?: Record<string, unknown>): Promise<unknown> {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("Payments are not configured yet. Please try again later.");
  const response = await fetch(`https://api.paystack.co${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store", signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Payment provider is unavailable. Your order is saved; you can retry.");
  return response.json();
}

export const verifiedPayment = z.object({ status: z.literal(true), data: z.object({ status: z.string(), reference: z.string(), amount: z.number().int().nonnegative(), currency: z.literal("NGN") }) });
export const initializedPayment = z.object({ status: z.literal(true), data: z.object({ authorization_url: z.url(), reference: z.string() }) });

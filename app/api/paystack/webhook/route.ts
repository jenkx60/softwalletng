import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function POST(request:Request) {
 const secret=process.env.PAYSTACK_SECRET_KEY;
 if(!secret) return new Response("Unavailable",{status:503});
 const raw=await request.text();
 const signature=request.headers.get("x-paystack-signature")??"";
 if(!/^[a-f0-9]{128}$/i.test(signature))return new Response("Invalid signature",{status:401});
 const expected=createHmac("sha512",secret).update(raw).digest();
 if(!timingSafeEqual(expected,Buffer.from(signature,"hex")))return new Response("Invalid signature",{status:401});
 let payload:unknown;try{payload=JSON.parse(raw);}catch{return new Response("Invalid payload",{status:400});}
 const parsed=z.object({event:z.string(),data:z.unknown()}).safeParse(payload);
 if(!parsed.success)return new Response("Invalid event",{status:400});
 if(parsed.data.event!=="charge.success")return Response.json({received:true});
 const payment=z.object({reference:z.string().min(1),amount:z.number().int().nonnegative(),currency:z.literal("NGN"),status:z.literal("success")}).safeParse(parsed.data.data);
 if(!payment.success)return new Response("Invalid payment",{status:400});
 const {error}=await createServiceRoleClient().rpc("fulfill_payment",{p_reference:payment.data.reference,p_amount_kobo:payment.data.amount});
 if(error)return new Response("Payment processing failed",{status:500});
 return Response.json({received:true});
}

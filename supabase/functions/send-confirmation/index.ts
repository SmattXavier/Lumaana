// Sends the booking confirmation email for a confirmed online booking.
// Body: { code: "<confirmation code>" }  →  { sent: boolean, reason?: string }
//
// Email goes through Resend's HTTP API (no SDK). Needs secrets:
//   RESEND_API_KEY, EMAIL_FROM (e.g. "Lumaana <bookings@yourdomain.ng>")
// Without them it answers { sent: false, reason: "email not configured" } and
// the booking flow carries on — the confirmation page is the fallback.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const naira = (kobo: number) =>
  `₦${new Intl.NumberFormat("en-NG").format(Math.floor(kobo / 100))}.${String(kobo % 100).padStart(2, "0")}`;

const day = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(`${iso}T00:00:00Z`));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ sent: false, reason: "method not allowed" }, 405);

  let code = "";
  try {
    code = String((await req.json()).code ?? "");
  } catch {
    return json({ sent: false, reason: "bad request" }, 400);
  }
  if (!/^[0-9a-f]{8}$/i.test(code)) return json({ sent: false, reason: "bad code" }, 400);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const { data, error } = await db.rpc("booking_summary", { p_code: code });
  const b = data?.[0];
  if (error || !b) return json({ sent: false, reason: "booking not found" }, 404);
  if (b.status !== "confirmed") return json({ sent: false, reason: `booking is ${b.status}` }, 409);
  if (!b.guest_email) return json({ sent: false, reason: "no email on booking" });

  const key = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM");
  if (!key || !from) return json({ sent: false, reason: "email not configured" });

  const appUrl = Deno.env.get("APP_URL") ?? "";
  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 0;color:#8b8577;font-size:13px">${label}</td><td style="padding:6px 0;text-align:right;font-size:14px">${value}</td></tr>`;
  const html = `<!doctype html><html><body style="margin:0;background:#0d1117;font-family:Helvetica,Arial,sans-serif;color:#e9e2d3">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="font-family:Georgia,serif;font-size:26px;letter-spacing:1px">Lumaana<span style="color:#d8b36a">.</span></div>
    <h1 style="font-family:Georgia,serif;font-weight:normal;font-size:30px;margin:28px 0 8px">You're booked, ${esc(b.guest_name.split(" ")[0])}.</h1>
    <p style="color:#b9b2a3;margin:0 0 24px">Thank you for booking direct with ${esc(b.branch_name)}. Your payment of ${naira(b.total_kobo)} was received.</p>
    <div style="border:1px solid #2a2f38;border-radius:14px;padding:20px">
      <div style="font-size:11px;letter-spacing:3px;color:#d8b36a;text-transform:uppercase">Confirmation</div>
      <div style="font-family:monospace;font-size:24px;letter-spacing:4px;margin:4px 0 16px">${esc(b.confirmation_code)}</div>
      <table style="width:100%;border-collapse:collapse;color:#e9e2d3">
        ${row("Hotel", esc(b.branch_name))}
        ${row("Room", esc(b.room_type))}
        ${row("Check-in", `${day(b.check_in)} · from 2:00 pm`)}
        ${row("Check-out", `${day(b.check_out)} · by noon`)}
        ${row("Guests", String(b.adults))}
        ${row("Paid", naira(b.total_kobo))}
      </table>
    </div>
    ${appUrl ? `<p style="margin:24px 0"><a href="${esc(appUrl)}/login?next=/stay" style="display:inline-block;background:#d8b36a;color:#0d1117;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px">Open your guest app</a></p>` : ""}
    <p style="color:#8b8577;font-size:12px;margin-top:24px">${esc(b.branch_address ?? "")}${b.branch_phone ? ` · ${esc(b.branch_phone)}` : ""}</p>
  </div></body></html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [b.guest_email],
      subject: `Booking confirmed · ${b.branch_name} · ${b.confirmation_code}`,
      html,
    }),
  });
  if (!res.ok) return json({ sent: false, reason: `email provider ${res.status}: ${(await res.text()).slice(0, 200)}` }, 502);
  return json({ sent: true });
});

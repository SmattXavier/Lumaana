export type ActionResult = { ok?: string; error?: string };

export function fd(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

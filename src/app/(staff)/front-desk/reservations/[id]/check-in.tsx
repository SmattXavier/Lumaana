"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { CameraIcon, RotateCcwIcon } from "lucide-react";
import { NativeSelect } from "@/components/app/native-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Enums } from "@/lib/database.types";
import { ROOM_STATUS } from "@/lib/labels";
import { createClient } from "@/lib/supabase/client";
import { checkIn } from "../../actions";
import { Field } from "../../form-dialog";

const ID_TYPES = ["NIN", "International passport", "Driver's licence", "Voter's card"];

/** Downscale and re-encode to JPEG so uploads stay small on hotel Wi-Fi. */
async function toJpeg(file: File, maxSide = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not read that image."))), "image/jpeg", 0.85)
  );
}

export function CheckInCard({
  reservationId, branchId, rooms, defaults,
}: {
  reservationId: string;
  branchId: string;
  rooms: { id: string; number: string; status: Enums<"room_status">; taken: boolean }[];
  defaults: { id_type: string | null; id_number: string | null };
}) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const ready = rooms.filter((r) => r.status === "vacant_clean" && !r.taken);

  function pick(file: File | undefined) {
    if (!file) return;
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }

  function submit(form: FormData) {
    start(async () => {
      if (photo) {
        try {
          const path = `${branchId}/${reservationId}.jpg`;
          const { error } = await createClient()
            .storage.from("guest-ids")
            .upload(path, await toJpeg(photo), { contentType: "image/jpeg", upsert: true });
          if (error) throw error;
          form.set("id_photo_path", path);
        } catch (e) {
          toast.error(`ID photo upload failed: ${e instanceof Error ? e.message : String(e)}`);
          return;
        }
      }
      const result = await checkIn(form);
      if (result.error) toast.error(result.error);
      else toast.success(result.ok);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Check in</CardTitle>
        <CardDescription>Assign a clean room, record the guest&apos;s ID and take a photo of it.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={submit} className="grid gap-4 md:grid-cols-[1fr_220px]">
          <input type="hidden" name="reservation_id" value={reservationId} />
          <div className="grid content-start gap-4">
            <Field label="Room" htmlFor="ci-room">
              <NativeSelect id="ci-room" name="room_id" required defaultValue={ready[0]?.id ?? ""}>
                {ready.length === 0 && <option value="">No clean room of this type is free</option>}
                {rooms.map((r) => (
                  <option key={r.id} value={r.id} disabled={r.status !== "vacant_clean" || r.taken}>
                    {r.number} — {r.taken ? "booked for these dates" : ROOM_STATUS[r.status]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ID type" htmlFor="ci-idtype">
                <NativeSelect id="ci-idtype" name="id_type" defaultValue={defaults.id_type ?? "NIN"}>
                  {ID_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="ID number" htmlFor="ci-idnum">
                <Input id="ci-idnum" name="id_number" defaultValue={defaults.id_number ?? ""} required autoComplete="off" />
              </Field>
            </div>
            <Button type="submit" size="lg" disabled={pending || ready.length === 0}>
              {pending ? "Checking in…" : "Check in guest"}
            </Button>
          </div>

          <div className="grid content-start gap-2">
            <span className="text-sm font-medium">ID photo</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex aspect-[1.586] items-center justify-center overflow-hidden rounded-lg border border-dashed bg-muted/40 text-sm text-muted-foreground hover:bg-muted"
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="ID preview" className="size-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-1">
                  <CameraIcon className="size-5" /> Take or upload photo
                </span>
              )}
            </button>
            {preview && (
              <Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
                <RotateCcwIcon /> Retake
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

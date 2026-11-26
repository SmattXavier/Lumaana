"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { SubmitButton } from "@/components/app/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { Enums, Tables } from "@/lib/database.types";
import { formatKobo, koboToNairaInput } from "@/lib/money";
import {
  createRoom,
  createRoomType,
  deleteRoom,
  deleteRoomType,
  updateRate,
  updateRoom,
  updateRoomType,
  type ActionResult,
} from "./actions";

export type RoomType = Pick<
  Tables<"room_types">,
  "id" | "name" | "description" | "base_rate_kobo" | "max_guests" | "photo_url" | "sort_order"
>;
export type Room = Pick<Tables<"rooms">, "id" | "number" | "floor" | "status" | "room_type_id">;

type Action = (fd: FormData) => Promise<ActionResult>;

/** Runs a server action and reports the result in a toast (DB messages verbatim). */
function run(action: Action, onSuccess?: () => void) {
  return async (fd: FormData) => {
    const result = await action(fd);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.ok ?? "Saved.");
      onSuccess?.();
    }
  };
}

function FormDialog({
  trigger,
  title,
  description,
  action,
  submitLabel,
  destructive,
  children,
}: {
  trigger: React.ReactElement;
  title: string;
  description?: string;
  action: Action;
  submitLabel: string;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form action={run(action, () => setOpen(false))} className="grid gap-4">
          {children}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton variant={destructive ? "destructive" : "default"}>{submitLabel}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- room types

function RoomTypeFields({ branchId, type }: { branchId: string; type?: RoomType }) {
  return (
    <>
      <input type="hidden" name="branch_id" value={branchId} />
      {type && <input type="hidden" name="id" value={type.id} />}
      <Field label="Name" htmlFor="rt-name">
        <Input id="rt-name" name="name" defaultValue={type?.name} required />
      </Field>
      <Field label="Description" htmlFor="rt-description">
        <Textarea id="rt-description" name="description" defaultValue={type?.description ?? ""} rows={2} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Max guests" htmlFor="rt-max">
          <Input id="rt-max" name="max_guests" type="number" min={1} max={20} defaultValue={type?.max_guests ?? 2} required />
        </Field>
        <Field label="Sort order" htmlFor="rt-sort">
          <Input id="rt-sort" name="sort_order" type="number" min={0} max={999} defaultValue={type?.sort_order ?? 0} required />
        </Field>
      </div>
      {!type && (
        <Field label="Nightly rate (₦)" htmlFor="rt-rate">
          <Input id="rt-rate" name="rate" inputMode="decimal" placeholder="45000" required />
        </Field>
      )}
      <Field label="Photo URL" htmlFor="rt-photo">
        <Input id="rt-photo" name="photo_url" type="url" defaultValue={type?.photo_url ?? ""} placeholder="Optional" />
      </Field>
    </>
  );
}

export function RoomTypesCard({ branchId, types, rooms }: { branchId: string; types: RoomType[]; rooms: Room[] }) {
  const roomCount = (typeId: string) => rooms.filter((r) => r.room_type_id === typeId).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Room types</CardTitle>
        <CardDescription>What guests choose from on the booking site, in sort order.</CardDescription>
        <CardAction>
          <FormDialog
            trigger={
              <Button size="sm">
                <PlusIcon /> Add room type
              </Button>
            }
            title="Add room type"
            action={createRoomType}
            submitLabel="Add room type"
          >
            <RoomTypeFields branchId={branchId} />
          </FormDialog>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Description</TableHead>
              <TableHead className="text-right">Max guests</TableHead>
              <TableHead className="text-right">Rooms</TableHead>
              <TableHead className="text-right">Sort</TableHead>
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {types.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell className="hidden max-w-xs truncate text-muted-foreground md:table-cell">
                  {t.description}
                </TableCell>
                <TableCell className="text-right tabular-nums">{t.max_guests}</TableCell>
                <TableCell className="text-right tabular-nums">{roomCount(t.id)}</TableCell>
                <TableCell className="text-right tabular-nums">{t.sort_order}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <FormDialog
                      trigger={
                        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${t.name}`}>
                          <PencilIcon />
                        </Button>
                      }
                      title={`Edit ${t.name}`}
                      description="Change the rate in the Rates card."
                      action={updateRoomType}
                      submitLabel="Save"
                    >
                      <RoomTypeFields branchId={branchId} type={t} />
                    </FormDialog>
                    <FormDialog
                      trigger={
                        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${t.name}`}>
                          <Trash2Icon />
                        </Button>
                      }
                      title={`Delete ${t.name}?`}
                      description="Only possible when no rooms or reservations use this type."
                      action={deleteRoomType}
                      submitLabel="Delete"
                      destructive
                    >
                      <input type="hidden" name="branch_id" value={branchId} />
                      <input type="hidden" name="id" value={t.id} />
                    </FormDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {types.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No room types yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------- rates

export function RatesCard({ branchId, types }: { branchId: string; types: RoomType[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rates</CardTitle>
        <CardDescription>
          Nightly rate per room type. New bookings use the new rate; existing reservations keep the rate they were booked at.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Room type</TableHead>
              <TableHead className="text-right">Current rate</TableHead>
              <TableHead className="w-0">New rate (₦)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {types.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell className="text-right tabular-nums">{formatKobo(t.base_rate_kobo)}</TableCell>
                <TableCell>
                  <form action={run(updateRate)} className="flex items-center gap-2">
                    <input type="hidden" name="branch_id" value={branchId} />
                    <input type="hidden" name="id" value={t.id} />
                    <Input
                      // Re-mount after a save so the field shows the stored value.
                      key={t.base_rate_kobo}
                      name="rate"
                      inputMode="decimal"
                      defaultValue={koboToNairaInput(t.base_rate_kobo)}
                      aria-label={`New rate for ${t.name}`}
                      className="w-32 text-right tabular-nums"
                      required
                    />
                    <SubmitButton size="sm" variant="outline" pendingLabel="Saving…">
                      Save
                    </SubmitButton>
                  </form>
                </TableCell>
              </TableRow>
            ))}
            {types.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Add a room type to set its rate.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------- rooms

const STATUS: Record<Enums<"room_status">, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  vacant_clean: { label: "Vacant · clean", variant: "outline" },
  vacant_dirty: { label: "Vacant · dirty", variant: "secondary" },
  occupied: { label: "Occupied", variant: "default" },
  out_of_order: { label: "Out of order", variant: "destructive" },
};

function RoomFields({ branchId, types, room }: { branchId: string; types: RoomType[]; room?: Room }) {
  return (
    <>
      <input type="hidden" name="branch_id" value={branchId} />
      {room && <input type="hidden" name="id" value={room.id} />}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Room number" htmlFor="room-number">
          <Input id="room-number" name="number" defaultValue={room?.number} required />
        </Field>
        <Field label="Floor" htmlFor="room-floor">
          <Input id="room-floor" name="floor" defaultValue={room?.floor ?? ""} placeholder="Optional" />
        </Field>
      </div>
      <Field label="Room type" htmlFor="room-type">
        <Select
          name="room_type_id"
          defaultValue={room?.room_type_id ?? types[0]?.id}
          items={types.map((t) => ({ value: t.id, label: t.name }))}
          required
        >
          <SelectTrigger id="room-type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {types.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </>
  );
}

export function RoomsCard({ branchId, types, rooms }: { branchId: string; types: RoomType[]; rooms: Room[] }) {
  const typeName = new Map(types.map((t) => [t.id, t.name]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rooms</CardTitle>
        <CardDescription>
          Physical rooms. Status is set by the front desk and maintenance, not here.
        </CardDescription>
        <CardAction>
          <FormDialog
            trigger={
              <Button size="sm" disabled={types.length === 0}>
                <PlusIcon /> Add room
              </Button>
            }
            title="Add room"
            action={createRoom}
            submitLabel="Add room"
          >
            <RoomFields branchId={branchId} types={types} />
          </FormDialog>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Room</TableHead>
              <TableHead>Floor</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rooms.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium tabular-nums">{r.number}</TableCell>
                <TableCell className="text-muted-foreground">{r.floor}</TableCell>
                <TableCell>{typeName.get(r.room_type_id)}</TableCell>
                <TableCell>
                  <Badge variant={STATUS[r.status].variant}>{STATUS[r.status].label}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <FormDialog
                      trigger={
                        <Button variant="ghost" size="icon-sm" aria-label={`Edit room ${r.number}`}>
                          <PencilIcon />
                        </Button>
                      }
                      title={`Edit room ${r.number}`}
                      action={updateRoom}
                      submitLabel="Save"
                    >
                      <RoomFields branchId={branchId} types={types} room={r} />
                    </FormDialog>
                    <FormDialog
                      trigger={
                        <Button variant="ghost" size="icon-sm" aria-label={`Delete room ${r.number}`}>
                          <Trash2Icon />
                        </Button>
                      }
                      title={`Delete room ${r.number}?`}
                      description="Only possible when the room has no reservations or maintenance tickets."
                      action={deleteRoom}
                      submitLabel="Delete"
                      destructive
                    >
                      <input type="hidden" name="branch_id" value={branchId} />
                      <input type="hidden" name="id" value={r.id} />
                    </FormDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {rooms.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {types.length === 0 ? "Add a room type first." : "No rooms yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

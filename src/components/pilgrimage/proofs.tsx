"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FileText, Loader2, Paperclip, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Field, PaymentOutcomeButtons, PStatus, useErrorToast } from "@/components/pilgrimage/shared";
import { useContributionProofs, useUploadContributionProof } from "@/hooks/pilgrimage";
import { useToast } from "@/hooks/use-toast";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { formatDateTime } from "@/lib/utils";
import type { Contribution } from "@/types/pilgrimage";

/**
 * A contribution's status cell: a pending payment can be confirmed or failed,
 * with the proof filed with it to check first; a settled one shows its status.
 */
export function ContributionOutcome({ contribution: c }: { contribution: Contribution }) {
  if (c.status === "pending" && c.payment_id) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <ProofButton contribution={c} />
        <PaymentOutcomeButtons paymentId={c.payment_id} />
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <PStatus status={c.status} />
      <ProofButton contribution={c} />
    </div>
  );
}

/** The backend takes at most this many files per payment. */
const MAX_PROOFS = 5;

/**
 * Proof of a contribution's payment: the receipt or screenshot the member (in
 * the app), an agent or staff filed with it, to check before confirming it.
 * Files can be added while the payment waits to be confirmed.
 */
export function ProofButton({ contribution: c }: { contribution: Contribution }) {
  const t = useTranslations("pilgrimage.proof");
  const [open, setOpen] = useState(false);
  if (!c.payment_id) return null;
  return (
    <>
      <Button size="sm" variant="ghost" className="h-8 gap-1 px-2 text-xs" onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
        <Paperclip size={13} /> {t("button")}
      </Button>
      <Modal open={open} onOpenChange={setOpen} title={t("title")} className="max-w-lg">
        {open && <ProofBody contribution={c} />}
      </Modal>
    </>
  );
}

function ProofBody({ contribution: c }: { contribution: Contribution }) {
  const t = useTranslations("pilgrimage.proof");
  const { has } = useEkubAccess();
  const { toast } = useToast();
  const onError = useErrorToast();
  const { data: proofs, isLoading } = useContributionProofs(c.participation_id, c.id);
  const upload = useUploadContributionProof();
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const count = proofs?.length ?? 0;
  const canUpload = c.status === "pending" && has(EKUB_PERMS.PILGRIMAGE_REGISTER) && count < MAX_PROOFS;

  const submit = () =>
    file &&
    upload.mutate(
      { id: c.participation_id, contributionId: c.id, file, description: note.trim() || undefined },
      {
        onSuccess: () => {
          toast({ title: t("uploaded") });
          setFile(null);
          setNote("");
          if (fileInput.current) fileInput.current.value = "";
        },
        onError,
      },
    );

  return (
    <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
      <p className="text-sm text-muted-foreground">{t("hint")}</p>
      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : count === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">{t("none")}</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {proofs!.map((f) => (
            <li key={f.id} className="flex items-center gap-3 p-3">
              <FileText size={18} className="shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                {f.file_url ? (
                  <a href={f.file_url} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium text-primary hover:underline">{f.file_name}</a>
                ) : (
                  <p className="truncate text-sm font-medium">{f.file_name}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(f.created_at)}{f.description ? ` · ${f.description}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {canUpload && (
        <div className="space-y-3 rounded-xl border border-border p-3">
          <Field label={t("file")} hint={t("fileHint")}>
            <Input ref={fileInput} type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Field>
          <Field label={t("note")}>
            <Input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="FT2611170001" />
          </Field>
          <div className="flex justify-end">
            <Button size="sm" disabled={!file || upload.isPending} onClick={submit}>
              {upload.isPending ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Upload size={14} className="mr-1" />} {t("upload")}
            </Button>
          </div>
        </div>
      )}
      {c.status === "pending" && count >= MAX_PROOFS && <p className="text-xs text-muted-foreground">{t("full", { max: MAX_PROOFS })}</p>}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Paperclip, Upload, Trash2, Download, FileText, Loader2, ImageIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRoundAttachments, useUploadAttachment, useDeleteAttachment } from "@/hooks/ekub";
import { ekubService } from "@/services/ekub";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime, getErrorMessage } from "@/lib/utils";
import type { ContributionAttachment } from "@/types/ekub";

const fmtSize = (n: number) => (n >= 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`);
const ACCEPT = "image/jpeg,image/png,image/gif,image/webp,image/heic,application/pdf";

/**
 * Evidence filed against a round's contributions (bank slips, receipts).
 * Attachments never change state: a contribution settles by a confirmed
 * payment, not by a picture of one.
 */
export function RoundAttachments({ roundId, members, canUpload }: {
  roundId: string;
  /** Members of the round with their contribution ids (from the fee ledger). */
  members: { memberId: string; name: string; contributionId: string }[];
  canUpload: boolean;
}) {
  const t = useTranslations("attachments");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const { data, isLoading } = useRoundAttachments(roundId);
  const upload = useUploadAttachment();
  const remove = useDeleteAttachment();

  const [uploading, setUploading] = useState(false);
  const [contributionId, setContributionId] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ContributionAttachment | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const err = (e: unknown) => toast({ title: "Error", description: getErrorMessage(e, "Request failed"), variant: "destructive" });

  const download = async (a: ContributionAttachment) => {
    setDownloading(a.id);
    try {
      const blob = await ekubService.downloadAttachment(a.contributionId, a.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = a.fileName || "attachment";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      err(e);
    } finally {
      setDownloading(null);
    }
  };

  const submit = () => {
    if (!file || !contributionId) return;
    upload.mutate(
      { roundId, contributionId, file, description: description.trim() || undefined },
      {
        onSuccess: () => { toast({ title: t("uploaded"), description: file.name }); setUploading(false); setFile(null); setDescription(""); },
        onError: err,
      }
    );
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-base"><Paperclip size={17} className="text-primary" /> {t("title")} {data && <span className="text-xs font-normal text-muted-foreground">· {data.length}</span>}</CardTitle>
        {canUpload && members.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => { setContributionId(members[0]?.contributionId ?? ""); setUploading(true); }}>
            <Upload size={14} className="mr-1" /> {t("upload")}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs text-muted-foreground">{t("note")}</p>
        {isLoading ? (
          <Skeleton className="h-24 rounded-xl" />
        ) : !data || data.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{t("none")}</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.map((a) => (
              <li key={a.id} className="flex gap-3 rounded-xl border border-border p-3">
                <button type="button" onClick={() => setPreview(a)} className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted" title={a.fileName}>
                  {a.isImage && a.fileUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.fileUrl} alt={a.fileName} className="h-full w-full object-cover" />
                  ) : a.isImage ? <ImageIcon size={22} className="text-muted-foreground" /> : <FileText size={22} className="text-muted-foreground" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{a.memberName}</p>
                  <p className="truncate text-xs text-muted-foreground">{a.description || a.fileName}</p>
                  <p className="text-[11px] text-muted-foreground">{fmtSize(a.fileSize)} · {formatDateTime(a.createdAt)}</p>
                  <div className="mt-1 flex gap-1">
                    <Button size="sm" variant="ghost" title={t("download")} disabled={downloading === a.id} onClick={() => download(a)}>
                      {downloading === a.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    </Button>
                    {canUpload && (
                      <Button size="sm" variant="ghost" title={tc("delete")} className="text-muted-foreground hover:text-destructive" disabled={remove.isPending} onClick={() => remove.mutate({ roundId, contributionId: a.contributionId, attachmentId: a.id }, { onSuccess: () => toast({ title: t("deleted"), description: a.fileName }), onError: err })}>
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {/* Upload */}
      <Modal open={uploading} onOpenChange={(o) => { if (!upload.isPending) setUploading(o); }} title={t("upload")} className="max-w-md">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{tc("member")}</Label>
            <Select value={contributionId} onValueChange={setContributionId}>
              <SelectTrigger><SelectValue placeholder={tc("member")} /></SelectTrigger>
              <SelectContent>{members.map((m) => <SelectItem key={m.contributionId} value={m.contributionId}>{m.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("file")}</Label>
            <input ref={fileRef} type="file" accept={ACCEPT} onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary" />
            <p className="text-xs text-muted-foreground">{t("fileHint")}</p>
          </div>
          <div className="space-y-1.5"><Label>{t("description")} <span className="font-normal text-muted-foreground">({tc("optional")})</span></Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("descriptionPlaceholder")} /></div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={upload.isPending} onClick={() => setUploading(false)}>{tc("cancel")}</Button>
            <Button disabled={!file || !contributionId || upload.isPending} onClick={submit}>
              {upload.isPending ? <Loader2 size={15} className="mr-1 animate-spin" /> : <Upload size={15} className="mr-1" />} {t("upload")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Preview */}
      <Modal open={!!preview} onOpenChange={(o) => !o && setPreview(null)} title={preview?.fileName ?? ""} className="max-w-3xl">
        {preview && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{preview.memberName} · {preview.description || "—"}</p>
            {preview.isImage && preview.fileUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.fileUrl} alt={preview.fileName} className="max-h-[70vh] w-full rounded-xl object-contain" />
            ) : (
              <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{t("noPreview")}</p>
            )}
            <div className="flex justify-end"><Button onClick={() => download(preview)}><Download size={15} className="mr-1" /> {t("download")}</Button></div>
          </div>
        )}
      </Modal>
    </Card>
  );
}

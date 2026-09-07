"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, Check, X, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import Image from "next/image";
import { DataTable, getInitials, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/dashboard/shared";
import { RequirePermission } from "@/components/auth/require-permission";
import { useApplications, useDecideApplication } from "@/hooks/ekub";
import { EKUB_PERMS, useEkubAccess } from "@/lib/auth/ekub-permissions";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { formatDate } from "@/lib/utils";
import type { Application, ApplicationStatus } from "@/types/ekub";

const statusVariant: Record<ApplicationStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-info/15 text-info border border-info/30",
  under_review: "bg-warning/15 text-warning border border-warning/30",
  accepted: "bg-success/15 text-success border border-success/30",
  rejected: "bg-destructive/15 text-destructive border border-destructive/30",
};

function ApprovalsInner() {
  const t = useTranslations("approvals");
  const td = useTranslations("declarations");
  const tc = useTranslations("common");
  const { has } = useEkubAccess();
  const { toast } = useToast();
  const canApprove = has(EKUB_PERMS.APPLICATION_APPROVE);

  const [status, setStatus] = useState<ApplicationStatus | "all">("all");
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 300);
  const { data, isLoading } = useApplications({ status, search: debounced });
  const decide = useDecideApplication();

  const [selected, setSelected] = useState<Application | null>(null);
  const [rejecting, setRejecting] = useState<Application | null>(null);
  const [reason, setReason] = useState("");

  const runDecision = (app: Application, decision: "accept" | "reject", why?: string) => {
    decide.mutate(
      { id: app.id, decision, reason: why },
      {
        onSuccess: () => {
          toast({ title: decision === "accept" ? "Accepted" : "Rejected", description: app.fullName });
          setSelected(null);
          setRejecting(null);
          setReason("");
        },
        onError: (e) => toast({ title: "Error", description: (e as Error).message, variant: "destructive" }),
      }
    );
  };

  const statusLabel = (s: ApplicationStatus) =>
    t(("status" + s.charAt(0).toUpperCase() + s.slice(1).replace(/_(.)/g, (_, c) => c.toUpperCase())) as string);

  const pending = (s: ApplicationStatus) => s === "submitted" || s === "under_review";

  const columns: DataTableColumn<Application>[] = [
    { id: "name", header: t("applicant"), mobile: "title", cell: (r) => (
      <div>
        <p className="font-medium text-foreground">{r.displayHandle}</p>
        <p className="text-xs text-muted-foreground">{r.fullName}</p>
      </div>
    ) },
    { id: "fayda", header: t("faydaId"), mobile: "detail", cell: (r) => <span className="text-sm">{r.faydaId}</span> },
    { id: "occupation", header: t("occupation"), mobile: "detail", cell: (r) => <span className="text-sm">{r.occupation}</span> },
    { id: "peer", header: t("peerVote"), mobile: "detail", cell: (r) => {
      const passed = r.peerVotesFor >= r.peerVoteQuorum;
      return (
        <Badge className={passed ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}>
          {r.peerVotesFor}/{r.peerVoteQuorum}
        </Badge>
      );
    } },
    { id: "share", header: t("shareStatus"), mobile: "detail", cell: (r) => (
      <Badge className={r.sharePurchased ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}>
        {r.sharePurchased ? t("sharePaid") : t("shareUnpaid")}
      </Badge>
    ) },
    { id: "submitted", header: t("submittedAt"), mobile: "detail", cell: (r) => <span className="text-sm">{formatDate(r.submittedAt)}</span> },
    { id: "status", header: tc("status"), mobile: "badge", cell: (r) => (
      <Badge className={statusVariant[r.status]}>{statusLabel(r.status)}</Badge>
    ) },
  ];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input placeholder={tc("search")} value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-xs" />
        <Select value={status} onValueChange={(v) => setStatus(v as ApplicationStatus | "all")}>
          <SelectTrigger className="sm:max-w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tc("all")}</SelectItem>
            <SelectItem value="submitted">{t("statusSubmitted")}</SelectItem>
            <SelectItem value="under_review">{t("statusUnderReview")}</SelectItem>
            <SelectItem value="accepted">{t("statusAccepted")}</SelectItem>
            <SelectItem value="rejected">{t("statusRejected")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data ?? []}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        avatar={(r) => ({ initials: getInitials(r.displayHandle), colorClass: "bg-primary/15 text-primary" })}
        emptyTitle={tc("noData")}
        emptyMessage={tc("noDataHint")}
        renderLeadingActions={(r) =>
          canApprove && pending(r.status) ? (
            <div className="flex gap-1.5">
              <Button size="sm" onClick={() => runDecision(r, "accept")}>
                <Check size={14} className="mr-1" /> {tc("approve")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setRejecting(r)}>
                <X size={14} />
              </Button>
            </div>
          ) : null
        }
        actions={[{ label: tc("view"), icon: Eye, onClick: (r) => setSelected(r) }]}
      />

      {/* Detail modal */}
      <Modal open={!!selected} onOpenChange={(o) => !o && setSelected(null)} title={selected?.displayHandle} className="max-w-2xl">
        {selected && (
          <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
            {selected.duplicateActiveMembership && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>{t("singleEkubWarning")}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <Info label={t("applicant")} value={selected.fullName} />
              <Info label={t("faydaId")} value={selected.faydaId} />
              <Info label={t("occupation")} value={selected.occupation} />
              <Info label={t("peerVote")} value={`${selected.peerVotesFor} / ${selected.peerVoteQuorum}`} />
            </div>

            {/* Declarations */}
            <div>
              <p className="mb-2 text-sm font-semibold text-foreground">{t("declarations")}</p>
              <div className="space-y-1.5">
                {(Object.keys(selected.declarations) as (keyof typeof selected.declarations)[]).map((k) => (
                  <div key={k} className="flex items-center gap-2 text-sm">
                    {selected.declarations[k] ? (
                      <CheckCircle2 size={16} className="text-success" />
                    ) : (
                      <XCircle size={16} className="text-destructive" />
                    )}
                    <span className="text-muted-foreground">{td(k)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* KYC docs */}
            {selected.kycDocs.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-semibold text-foreground">{t("kycDocs")}</p>
                <div className="grid grid-cols-2 gap-3">
                  {selected.kycDocs.map((d) => (
                    <Card key={d.id} className="overflow-hidden">
                      <div className="relative h-32 w-full bg-muted">
                        <Image src={d.url} alt={d.label} fill className="object-cover" unoptimized />
                      </div>
                      <p className="p-2 text-xs text-muted-foreground">{d.label}</p>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <p className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">{t("assignedIds")}</p>

            {canApprove && pending(selected.status) && (
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setRejecting(selected)}>
                  {tc("reject")}
                </Button>
                <Button onClick={() => runDecision(selected, "accept")} disabled={decide.isPending}>
                  {tc("approve")}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Reject modal */}
      <Modal open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)} title={t("rejectTitle")} className="max-w-md">
        {rejecting && (
          <div className="space-y-4">
            <Input placeholder={t("rejectReason")} value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejecting(null)}>{tc("cancel")}</Button>
              <Button variant="destructive" onClick={() => runDecision(rejecting, "reject", reason)} disabled={decide.isPending}>
                {tc("reject")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  );
}

export default function ApprovalsPage() {
  return (
    <RequirePermission anyOf={[EKUB_PERMS.APPLICATION_READ]}>
      <ApprovalsInner />
    </RequirePermission>
  );
}

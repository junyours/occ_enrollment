import React, { useEffect, useState } from "react";
import axios from "axios";
import { Check, ChevronDown, Clock, X } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { RejectDialog } from "./CurriculumAudit";

/**
 * For program heads, on Student Grades: grades the registrar and evaluators matched to
 * curriculum subjects, waiting for approval before they count.
 */
export default function PendingMatches({ onOpenStudent, onDecided }) {
    const { toast } = useToast();
    const [data, setData] = useState(null);
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [rejecting, setRejecting] = useState(null);

    const load = () => axios.post(route("student-grades.pending")).then((response) => setData(response.data)).catch(() => setData(null));
    useEffect(() => { load(); }, []);

    const act = async (send, success) => {
        setBusy(true);
        try {
            await send();
            await load();
            toast({ description: success, variant: "success" });
            onDecided?.();
            return true;
        } catch (error) {
            const errors = error.response?.data?.errors;
            toast({ description: (errors && Object.values(errors).flat()[0]) || error.response?.data?.message || "That didn't work. Please try again.", variant: "destructive" });
            return false;
        } finally {
            setBusy(false);
        }
    };

    if (!data?.can_approve || data.matches.length === 0) return null;
    const count = data.matches.length;

    return (
        <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4" aria-labelledby="pending-matches-title">
            <button type="button" className="flex w-full items-center justify-between gap-2 text-left" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
                <span id="pending-matches-title" className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                    {count} grade {count === 1 ? "match is" : "matches are"} waiting for your approval
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
            {open && (
                <ul className="mt-3 divide-y divide-border/60">
                    {data.matches.map((match) => (
                        <li key={match.id} className="flex flex-wrap items-start justify-between gap-3 py-2 text-sm">
                            <div className="min-w-0 flex-1 leading-snug">
                                <p>
                                    <button type="button" className="font-medium underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none" onClick={() => onOpenStudent?.(match.student.id_no)}>
                                        {match.student.name}
                                    </button>
                                    <span className="text-muted-foreground"> · {match.student.id_no} · {match.program}</span>
                                </p>
                                <p>
                                    {match.grade ? `${match.grade.code} ${match.grade.title} (${match.grade.grade || match.grade.status}, ${match.grade.term})` : "A grade that's no longer on record"}
                                    {" → "}<span className="font-medium">{match.target ?? "doesn't count toward the curriculum"}</span>
                                </p>
                                <p className="text-xs text-muted-foreground">Asked by {match.requested_by ?? "someone"}{match.note ? ` · “${match.note}”` : ""}</p>
                            </div>
                            <div className="flex gap-1.5">
                                <Button type="button" size="sm" className="h-8" disabled={busy} onClick={() => act(() => axios.post(route("student-grades.match.approve", match.id)), "Approved.")}>
                                    <Check aria-hidden="true" />Approve
                                </Button>
                                <Button type="button" size="sm" variant="outline" className="h-8" disabled={busy} onClick={() => setRejecting(match)}>
                                    <X aria-hidden="true" />Reject
                                </Button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            <RejectDialog
                match={rejecting}
                busy={busy}
                onClose={() => setRejecting(null)}
                onReject={(match, reason) => act(() => axios.post(route("student-grades.match.reject", match.id), { reason }), "Rejected.").then((ok) => { if (ok) setRejecting(null); })}
            />
        </section>
    );
}

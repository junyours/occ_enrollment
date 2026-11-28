import React, { useId } from "react";
import { useForm } from "@inertiajs/react";
import { Loader2 } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/Components/ui/dialog";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { useToast } from "@/hooks/use-toast";

const toNumberOrNull = (value) => (value === "" || value === null || value === undefined ? null : Number(value));

/**
 * Edits the unit-load limits behind the curriculum page warnings: the program's maximum units
 * per semester and in summer (blank = default), and this curriculum year's required total.
 */
export default function UnitLimitsDialog({ open, onOpenChange, curriculumId, limits, program, yearLabel, onSaved, onCloseAutoFocus }) {
    const prefix = useId();
    const { toast } = useToast();
    const { data, setData, post, transform, processing, errors, clearErrors } = useForm({
        curriculum_id: curriculumId,
        max_semester_units: limits?.max_semester_units ?? "",
        max_summer_units: limits?.max_summer_units ?? "",
        required_total_units: limits?.required_total_units ?? "",
    });

    const submit = (event) => {
        event.preventDefault();
        if (processing) return;
        transform((form) => ({
            curriculum_id: form.curriculum_id,
            max_semester_units: toNumberOrNull(form.max_semester_units),
            max_summer_units: toNumberOrNull(form.max_summer_units),
            required_total_units: toNumberOrNull(form.required_total_units),
        }));
        post(route("curr.unit-limits"), {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                toast({ description: "Unit limits saved.", variant: "success" });
                onOpenChange(false);
                onSaved();
            },
        });
    };

    const field = (name, label, help, placeholder, max) => (
        <div className="space-y-1.5">
            <Label htmlFor={`${prefix}-${name}`}>{label}</Label>
            <Input
                id={`${prefix}-${name}`}
                type="number"
                min={1}
                max={max}
                step={1}
                inputMode="numeric"
                value={data[name]}
                placeholder={placeholder}
                disabled={processing}
                onChange={(event) => { setData(name, event.target.value); clearErrors(name); }}
                aria-invalid={Boolean(errors[name])}
                aria-describedby={`${prefix}-${name}-help`}
                className={`w-32 ${errors[name] ? "border-red-500" : ""}`}
            />
            <p id={`${prefix}-${name}-help`} className="text-xs text-muted-foreground">{help}</p>
            {errors[name] && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{errors[name]}</p>}
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={(value) => { if (!processing) onOpenChange(value); }}>
            <DialogContent onCloseAutoFocus={onCloseAutoFocus} className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Unit limits</DialogTitle>
                    <DialogDescription>Used for the unit checks on this page. They only show warnings; nothing is blocked.</DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-5">
                    <fieldset className="space-y-4 rounded-lg border p-4">
                        <legend className="px-1 text-sm font-medium">Every {program} curriculum</legend>
                        {field("max_semester_units", "Maximum units per semester", `1st and 2nd semester. Leave blank to use ${limits?.default_semester_units ?? 26}.`, `${limits?.default_semester_units ?? 26} (default)`, 60)}
                        {field("max_summer_units", "Maximum units in summer", `Leave blank to use ${limits?.default_summer_units ?? 9}.`, `${limits?.default_summer_units ?? 9} (default)`, 30)}
                    </fieldset>
                    <fieldset className="space-y-4 rounded-lg border p-4">
                        <legend className="px-1 text-sm font-medium">{program} {yearLabel} only</legend>
                        {field("required_total_units", "Required total units", "From the approved curriculum. Leave blank to skip this check.", "Not set", 400)}
                    </fieldset>
                    {errors.curriculum_id && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{errors.curriculum_id}</p>}
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="outline" disabled={processing} onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={processing}>{processing && <Loader2 className="animate-spin" aria-hidden="true" />}{processing ? "Saving…" : "Save limits"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

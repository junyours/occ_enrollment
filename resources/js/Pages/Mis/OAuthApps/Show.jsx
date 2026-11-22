import { Head, Link, router, useForm } from "@inertiajs/react";
import { useState } from "react";
import { ArrowLeft, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/Components/ui/alert-dialog";
import { Button } from "@/Components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/Components/ui/card";
import { Input } from "@/Components/ui/input";
import ActivityList from "@/Components/OAuth/ActivityList";
import CredentialsCard from "@/Components/OAuth/CredentialsCard";
import SecretRevealDialog from "@/Components/OAuth/SecretRevealDialog";
import AppForm from "./AppForm";
import { StatusBadge } from "./Index";

function Stat({ label, value }) {
    return (
        <div className="rounded-md bg-muted p-3">
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
        </div>
    );
}

function StatusControl({ app }) {
    const [confirming, setConfirming] = useState(false);
    const turningOff = app.status === "active";

    const submit = () => {
        router.put(route("mis.oauth-apps.status", app.id), { status: turningOff ? "suspended" : "active" }, {
            preserveScroll: true,
            onSuccess: () => toast.success(turningOff ? `${app.name} is switched off` : `${app.name} is switched on`),
            onFinish: () => setConfirming(false),
        });
    };

    return (
        <>
            <Button variant={turningOff ? "outline" : "default"} onClick={() => setConfirming(true)}>
                {turningOff ? "Switch off" : "Switch on"}
            </Button>
            <AlertDialog open={confirming} onOpenChange={setConfirming}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{turningOff ? `Switch off ${app.name}?` : `Switch on ${app.name}?`}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {turningOff
                                ? "Everyone signed in to it is signed out, and nobody can sign in until you switch it back on."
                                : "People who meet its rules can sign in again."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={submit}>{turningOff ? "Switch off" : "Switch on"}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

function SettingsCard({ app, options }) {
    const { data, setData, put, processing, errors, isDirty } = useForm({
        name: app.name,
        description: app.description ?? "",
        homepage_url: app.homepage_url ?? "",
        redirect_uris: app.redirect_uris.length ? app.redirect_uris : [""],
        scopes: app.scopes,
        allowed_roles: app.allowed_roles,
        requires_enrollment: app.requires_enrollment,
        skips_consent: app.skips_consent,
    });

    const submit = (e) => {
        e.preventDefault();
        put(route("mis.oauth-apps.update", app.id), {
            preserveScroll: true,
            onSuccess: () => toast.success("Settings saved"),
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Settings</CardTitle>
                <CardDescription>
                    Removing a role or a kind of data, or requiring enrollment, signs everyone out of the app so
                    they're checked against the new rules.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={submit} className="space-y-6">
                    <AppForm data={data} setData={setData} errors={errors} options={options} />
                    <div className="flex justify-end">
                        <Button type="submit" disabled={processing || !isDirty}>
                            {processing ? "Saving…" : "Save settings"}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

function MaintainersCard({ app, maintainers }) {
    const { data, setData, post, processing, errors, reset } = useForm({ user_id_no: "" });
    const [removing, setRemoving] = useState(null);

    const add = (e) => {
        e.preventDefault();
        post(route("mis.oauth-apps.maintainers.store", app.id), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                toast.success("Maintainer added");
            },
        });
    };

    const remove = () => {
        router.delete(route("mis.oauth-apps.maintainers.destroy", [app.id, removing.id]), {
            preserveScroll: true,
            onSuccess: () => toast.success(`${removing.name} removed`),
            onFinish: () => setRemoving(null),
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Maintainers</CardTitle>
                <CardDescription>
                    They see this app under "My apps" and can issue a new secret. Only MIS can change who may sign in.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <form onSubmit={add} className="space-y-1">
                    <div className="flex gap-2">
                        <Input
                            aria-label="ID number of the maintainer"
                            value={data.user_id_no}
                            onChange={(e) => setData("user_id_no", e.target.value)}
                            placeholder="ID number"
                        />
                        <Button type="submit" disabled={processing}>
                            <UserPlus className="mr-1 h-4 w-4" /> Add
                        </Button>
                    </div>
                    {errors.user_id_no && <p className="text-sm text-destructive">{errors.user_id_no}</p>}
                </form>

                {maintainers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No maintainers yet.</p>
                ) : (
                    <ul className="divide-y">
                        {maintainers.map((person) => (
                            <li key={person.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                                <div className="min-w-0">
                                    <p className="truncate font-medium">{person.name}</p>
                                    <p className="font-mono text-xs text-muted-foreground">{person.user_id_no}</p>
                                </div>
                                <Button variant="ghost" size="icon" aria-label={`Remove ${person.name}`} onClick={() => setRemoving(person)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>

            <AlertDialog open={Boolean(removing)} onOpenChange={(open) => !open && setRemoving(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove {removing?.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            They lose access to this app's settings. If they ever saw the client secret, issue a new one.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={remove}>Remove</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}

export default function Show({ app, maintainers, activity, endpoints, options, newSecret }) {
    return (
        <div className="space-y-6 p-6">
            <Head title={app.name} />

            <Link href={route("mis.oauth-apps.index")} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="mr-1 h-4 w-4" /> Connected apps
            </Link>

            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight">{app.name}</h1>
                        <StatusBadge status={app.status} />
                    </div>
                    {app.description && <p className="text-muted-foreground">{app.description}</p>}
                    <p className="text-sm text-muted-foreground">
                        Registered {app.created_at ? new Date(app.created_at).toLocaleDateString() : ""}
                        {app.created_by ? ` by ${app.created_by}` : ""}
                    </p>
                </div>
                <StatusControl app={app} />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="Signed in now" value={app.stats.active_sessions} />
                <Stat label="Sign-ins, last 7 days" value={app.stats.sign_ins_7d} />
                <Stat label="Blocked, last 7 days" value={app.stats.blocked_7d} />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="min-w-0 space-y-6 lg:col-span-2">
                    <SettingsCard key={app.id} app={app} options={options} />
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Recent activity</CardTitle>
                            <CardDescription>Sign-ins, blocked attempts and changes. Also in the activity log.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ActivityList activity={activity} />
                        </CardContent>
                    </Card>
                </div>
                <div className="min-w-0 space-y-6">
                    <CredentialsCard app={app} endpoints={endpoints} rotateUrl={route("mis.oauth-apps.secret", app.id)} />
                    <MaintainersCard app={app} maintainers={maintainers} />
                </div>
            </div>

            <SecretRevealDialog secret={newSecret} appName={app.name} />
        </div>
    );
}

Show.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;

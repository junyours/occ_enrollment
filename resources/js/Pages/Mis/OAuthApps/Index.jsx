import { Head, Link, useForm } from "@inertiajs/react";
import { useState } from "react";
import { ChevronRight, KeyRound, Plus } from "lucide-react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Badge } from "@/Components/ui/badge";
import { Button } from "@/Components/ui/button";
import { Card, CardContent } from "@/Components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/Components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/Components/ui/table";
import AppForm, { emptyApp } from "./AppForm";

export function StatusBadge({ status }) {
    return status === "active" ? (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-950 dark:text-green-300">On</Badge>
    ) : (
        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300">Switched off</Badge>
    );
}

function RegisterDialog({ open, onOpenChange, options }) {
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm(emptyApp);

    const close = () => {
        reset();
        clearErrors();
        onOpenChange(false);
    };

    const submit = (e) => {
        e.preventDefault();
        post(route("mis.oauth-apps.store"), { onSuccess: () => reset() });
    };

    return (
        <Dialog open={open} onOpenChange={(value) => (value ? onOpenChange(true) : close())}>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                <form onSubmit={submit} className="space-y-6">
                    <DialogHeader>
                        <DialogTitle>Register a school app</DialogTitle>
                        <DialogDescription>
                            The app gets a client ID (and a secret, if it has a server) to put in its configuration.
                        </DialogDescription>
                    </DialogHeader>

                    <AppForm data={data} setData={setData} errors={errors} options={options} creating />

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={close}>Cancel</Button>
                        <Button type="submit" disabled={processing}>{processing ? "Registering…" : "Register app"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default function Index({ apps, options }) {
    const [registering, setRegistering] = useState(false);

    return (
        <div className="space-y-6 p-6">
            <Head title="Connected apps" />

            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                    <h1 className="text-2xl font-bold tracking-tight">Connected apps</h1>
                    <p className="text-muted-foreground">
                        School apps that sign people in with "Continue with SIS-OCC". SIS-OCC checks each person
                        against the app's rules before the app learns anything about them.
                    </p>
                </div>
                <Button onClick={() => setRegistering(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Register app
                </Button>
            </div>

            {apps.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                        <KeyRound className="h-10 w-10 text-muted-foreground" />
                        <h2 className="text-lg font-semibold">Connect your first school app</h2>
                        <p className="max-w-md text-sm text-muted-foreground">
                            Register an app such as the library or the CSG election, choose who may sign in, then give
                            its developer the client ID and secret.
                        </p>
                        <Button onClick={() => setRegistering(true)}>
                            <Plus className="mr-2 h-4 w-4" /> Register app
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>App</TableHead>
                                <TableHead>Who can sign in</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Sign-ins, 7 days</TableHead>
                                <TableHead className="text-right">Blocked, 7 days</TableHead>
                                <TableHead className="text-right">Maintainers</TableHead>
                                <TableHead className="w-8"><span className="sr-only">Open</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {apps.map((app) => (
                                <TableRow key={app.id} className="cursor-pointer">
                                    <TableCell>
                                        <Link href={route("mis.oauth-apps.show", app.id)} className="font-medium hover:underline">
                                            {app.name}
                                        </Link>
                                        <p className="font-mono text-xs text-muted-foreground">{app.id}</p>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        <span>{app.allowed_roles_text}</span>
                                        {app.requires_enrollment && app.allowed_roles.includes("student") && (
                                            <span className="block text-muted-foreground">Students: enrolled this semester</span>
                                        )}
                                    </TableCell>
                                    <TableCell><StatusBadge status={app.status} /></TableCell>
                                    <TableCell className="text-right tabular-nums">{app.stats.sign_ins_7d}</TableCell>
                                    <TableCell className="text-right tabular-nums">{app.stats.blocked_7d}</TableCell>
                                    <TableCell className="text-right tabular-nums">{app.maintainers_count}</TableCell>
                                    <TableCell>
                                        <Link href={route("mis.oauth-apps.show", app.id)} aria-label={`Open ${app.name}`}>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}

            <RegisterDialog open={registering} onOpenChange={setRegistering} options={options} />
        </div>
    );
}

Index.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;

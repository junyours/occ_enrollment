import { Head } from "@inertiajs/react";
import { AppWindow } from "lucide-react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Badge } from "@/Components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/Components/ui/card";
import ActivityList from "@/Components/OAuth/ActivityList";
import CredentialsCard from "@/Components/OAuth/CredentialsCard";
import SecretRevealDialog from "@/Components/OAuth/SecretRevealDialog";

function Rules({ app }) {
    return (
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
                <dt className="text-muted-foreground">Who can sign in</dt>
                <dd>
                    {app.allowed_roles_text}
                    {app.requires_enrollment && app.allowed_roles.includes("student") ? " (students enrolled this semester)" : ""}
                </dd>
            </div>
            <div>
                <dt className="text-muted-foreground">Data the app can read</dt>
                <dd className="flex flex-wrap gap-1">
                    {app.scopes.map((scope) => (
                        <code key={scope} className="rounded bg-muted px-1.5 py-0.5 text-xs">{scope}</code>
                    ))}
                </dd>
            </div>
            <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd>{app.status === "active" ? "On" : "Switched off by MIS"}</dd>
            </div>
            <div>
                <dt className="text-muted-foreground">Signed in now</dt>
                <dd className="tabular-nums">{app.stats.active_sessions}</dd>
            </div>
        </dl>
    );
}

export default function MyApps({ apps, endpoints, newSecret, newSecretFor }) {
    const secretApp = apps.find((app) => app.id === newSecretFor);

    return (
        <div className="space-y-6 p-6">
            <Head title="My apps" />

            <div className="max-w-2xl">
                <h1 className="text-2xl font-bold tracking-tight">My apps</h1>
                <p className="text-muted-foreground">
                    School apps you maintain that sign people in with "Continue with SIS-OCC". Ask the MIS office to
                    change who may sign in, what data an app reads, or its callback URLs.
                </p>
            </div>

            {apps.length === 0 && (
                <Card>
                    <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                        <AppWindow className="h-10 w-10 text-muted-foreground" />
                        <p className="max-w-md text-sm text-muted-foreground">
                            You don't maintain any apps right now. The MIS office adds maintainers to each app.
                        </p>
                    </CardContent>
                </Card>
            )}

            {apps.map((app) => (
                <section key={app.id} className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold">{app.name}</h2>
                        {app.status !== "active" && <Badge variant="outline">Switched off</Badge>}
                    </div>
                    <div className="grid gap-6 lg:grid-cols-3">
                        <div className="min-w-0 space-y-6 lg:col-span-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Rules set by MIS</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Rules app={app} />
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Recent activity</CardTitle>
                                    <CardDescription>Use it to check why someone couldn't sign in.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ActivityList activity={app.activity} />
                                </CardContent>
                            </Card>
                        </div>
                        <div className="min-w-0">
                            <CredentialsCard app={app} endpoints={endpoints} rotateUrl={route("oauth.my-apps.secret", app.id)} />
                        </div>
                    </div>
                </section>
            ))}

            {secretApp && <SecretRevealDialog secret={newSecret} appName={secretApp.name} />}
        </div>
    );
}

MyApps.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;

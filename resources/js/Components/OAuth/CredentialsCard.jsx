import { router } from "@inertiajs/react";
import { useState } from "react";
import { toast } from "sonner";
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
import { Badge } from "@/Components/ui/badge";
import { Button } from "@/Components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/Components/ui/card";
import CopyButton from "@/Components/ui/CopyButton";

function Row({ label, value, mono = true }) {
    return (
        <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <div className="flex items-start gap-1 rounded-md bg-muted px-3 py-2">
                <span className={`flex-1 break-all text-sm ${mono ? "font-mono" : ""}`}>{value}</span>
                <CopyButton text={value} size="xs" />
            </div>
        </div>
    );
}

/**
 * Client ID, secret, callback URLs and endpoints: what the app's developer
 * puts into the app's configuration.
 */
export default function CredentialsCard({ app, endpoints, rotateUrl }) {
    const [confirming, setConfirming] = useState(false);
    const [rotating, setRotating] = useState(false);

    const rotate = () => {
        router.post(rotateUrl, {}, {
            preserveScroll: true,
            onStart: () => setRotating(true),
            onFinish: () => {
                setRotating(false);
                setConfirming(false);
            },
            onError: () => toast.error("The secret couldn't be replaced. Try again."),
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Credentials</CardTitle>
                <CardDescription>For the app's configuration file.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Row label="Client ID" value={app.id} />

                <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Client secret</p>
                    {app.confidential ? (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted px-3 py-2">
                            <span className="text-sm text-muted-foreground">Hidden. Only a hash is stored.</span>
                            {rotateUrl && (
                                <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
                                    Issue new secret
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-md bg-muted px-3 py-2 text-sm">
                            <Badge variant="outline" className="mr-2">Public client</Badge>
                            No secret. The app must use PKCE.
                        </div>
                    )}
                </div>

                <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Callback URLs</p>
                    <ul className="space-y-1">
                        {app.redirect_uris.map((uri) => (
                            <li key={uri} className="break-all rounded-md bg-muted px-3 py-2 font-mono text-sm">{uri}</li>
                        ))}
                    </ul>
                </div>

                <Row label="Authorize URL" value={endpoints.authorize} />
                <Row label="Token URL" value={endpoints.token} />
                <Row label="User info URL" value={endpoints.userinfo} />
            </CardContent>

            <AlertDialog open={confirming} onOpenChange={setConfirming}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Issue a new client secret?</AlertDialogTitle>
                        <AlertDialogDescription>
                            The current secret stops working right away. Until the new one is in {app.name}'s
                            configuration, nobody can sign in to it. People already signed in stay signed in.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={rotating}>Keep current secret</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                rotate();
                            }}
                            disabled={rotating}
                        >
                            {rotating ? "Issuing…" : "Issue new secret"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}

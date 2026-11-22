import { Head } from "@inertiajs/react";
import { ShieldX } from "lucide-react";
import { Button } from "@/Components/ui/button";
import SignInShell, { AccountRow } from "@/Components/OAuth/SignInShell";

/**
 * Shown when SIS-OCC refuses a sign-in to another school app. No code is
 * issued, and the app only learns "access_denied" if the person goes back.
 */
export default function Denied({ appName, reasons, backUrl, switchAccountUrl, account }) {
    return (
        <SignInShell>
            <Head title={`You can't use ${appName}`} />

            <div className="space-y-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                    <ShieldX className="h-5 w-5" />
                </span>
                <h1 className="text-xl font-semibold">You can't use {appName} with this account</h1>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                    {reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                    ))}
                </ul>
                <p className="text-sm text-muted-foreground">
                    SIS-OCC didn't send {appName} any of your details.
                </p>
            </div>

            <AccountRow account={account} switchAccountUrl={switchAccountUrl} />

            {backUrl && (
                <Button asChild className="w-full">
                    <a href={backUrl}>Back to {appName}</a>
                </Button>
            )}
        </SignInShell>
    );
}

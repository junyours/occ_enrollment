import { Head } from "@inertiajs/react";
import { Check } from "lucide-react";
import { Button } from "@/Components/ui/button";
import SignInShell, { AccountRow } from "@/Components/OAuth/SignInShell";

/**
 * "Allow access?" screen, shown only for apps MIS didn't mark as school-owned.
 * Plain HTML forms: on success Passport redirects the browser to the other app,
 * which an Inertia request couldn't follow.
 */
export default function Authorize({ app, scopes, account, form, switchAccountUrl }) {
    const hidden = (
        <>
            <input type="hidden" name="_token" value={form.csrf_token} />
            <input type="hidden" name="state" value={form.state ?? ""} />
            <input type="hidden" name="client_id" value={form.client_id} />
            <input type="hidden" name="auth_token" value={form.auth_token} />
        </>
    );

    return (
        <SignInShell>
            <Head title={`Continue to ${app.name}`} />

            <div className="space-y-1">
                <h1 className="text-xl font-semibold">Continue to {app.name}</h1>
                {app.description && <p className="text-sm text-muted-foreground">{app.description}</p>}
            </div>

            <AccountRow account={account} switchAccountUrl={switchAccountUrl} />

            <div className="space-y-2">
                <p className="text-sm font-medium">{app.name} will receive</p>
                <ul className="space-y-2">
                    {scopes.map((scope) => (
                        <li key={scope.id} className="flex items-start gap-2 text-sm">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                            {scope.description}
                        </li>
                    ))}
                </ul>
                <p className="text-xs text-muted-foreground">
                    It won't receive your password, grades, address or billing records.
                </p>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <form method="post" action={form.action}>
                    {hidden}
                    <input type="hidden" name="_method" value="DELETE" />
                    <Button type="submit" variant="outline" className="w-full sm:w-auto">Cancel</Button>
                </form>
                <form method="post" action={form.action}>
                    {hidden}
                    <Button type="submit" className="w-full sm:w-auto">Allow and continue</Button>
                </form>
            </div>

            {app.homepage_url && (
                <p className="text-center text-xs text-muted-foreground">
                    App website: <span className="break-all">{app.homepage_url}</span>
                </p>
            )}
        </SignInShell>
    );
}

import { Card, CardContent } from "@/Components/ui/card";
import OCC_LOGO from "../../../images/OCC_LOGO.svg";

/**
 * Frame for the screens SIS-OCC shows while signing someone in to another
 * school app. Matches the SIS login page.
 */
export default function SignInShell({ children }) {
    return (
        <div className="flex min-h-svh items-center justify-center bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-slate-50 via-slate-100 to-blue-100 px-4 py-10 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950">
            <Card className="w-full max-w-md shadow-xl">
                <CardContent className="space-y-6 p-6 sm:p-8">
                    <div className="flex items-center gap-3">
                        <img src={OCC_LOGO} alt="" className="h-10 w-10" />
                        <div>
                            <p className="font-semibold leading-tight">SIS-OCC</p>
                            <p className="text-xs text-muted-foreground">Student Information System</p>
                        </div>
                    </div>
                    {children}
                </CardContent>
            </Card>
        </div>
    );
}

export function AccountRow({ account, switchAccountUrl }) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-md border p-3">
            <div className="min-w-0">
                <p className="truncate text-sm font-medium">{account.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{account.user_id_no}</p>
            </div>
            {switchAccountUrl && (
                <a href={switchAccountUrl} className="shrink-0 text-sm font-medium text-primary hover:underline">
                    Use another account
                </a>
            )}
        </div>
    );
}

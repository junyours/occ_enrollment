import { Badge } from "@/Components/ui/badge";

const ACTIONS = {
    "oauth.sign_in_allowed": { label: "Signed in", className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" },
    "oauth.sign_in_blocked": { label: "Blocked", className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
    "oauth.app_registered": { label: "Registered" },
    "oauth.app_updated": { label: "Settings changed" },
    "oauth.secret_rotated": { label: "New secret" },
    "oauth.app_suspended": { label: "Switched off", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
    "oauth.app_activated": { label: "Switched on" },
    "oauth.maintainer_added": { label: "Maintainer added" },
    "oauth.maintainer_removed": { label: "Maintainer removed" },
};

const CHECK_LABELS = {
    role: "role not allowed",
    active: "account deactivated",
    enrollment: "not enrolled this semester",
    app_suspended: "app switched off",
};

const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export default function ActivityList({ activity }) {
    if (!activity.length) {
        return <p className="text-sm text-muted-foreground">No sign-ins or changes yet.</p>;
    }

    return (
        <ul className="divide-y">
            {activity.map((entry) => {
                const action = ACTIONS[entry.action] ?? { label: entry.action };

                return (
                    <li key={entry.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 py-2.5 text-sm">
                        <Badge variant="secondary" className={`shrink-0 font-medium ${action.className ?? ""}`}>
                            {action.label}
                        </Badge>
                        <div className="min-w-0 flex-1">
                            <p className="break-words">{entry.description}</p>
                            {entry.failed_checks?.length > 0 && (
                                <p className="text-muted-foreground">
                                    Reason: {entry.failed_checks.map((key) => CHECK_LABELS[key] ?? key).join(", ")}
                                </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                                {entry.by ? `${entry.by} · ` : ""}
                                {entry.created_at ? formatter.format(new Date(entry.created_at)) : ""}
                            </p>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}

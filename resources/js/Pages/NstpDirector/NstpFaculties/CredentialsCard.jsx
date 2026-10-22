import { useState } from "react";
import { Button } from "@/Components/ui/button";
import { Eye, EyeOff } from "lucide-react";

export default function CredentialsCard({ data, credentials }) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <section aria-label="New faculty credentials" className="space-y-4 rounded-md border p-4">
            <p className="font-medium">
                {[data.first_name, data.middle_name, data.last_name].filter(Boolean).join(" ")}
            </p>
            <p className="text-sm text-muted-foreground">
                Save these credentials before closing. The generated password is shown only after creation.
            </p>
            {credentials.email_sent === true && (
                <p role="status" className="text-sm text-muted-foreground">
                    Credentials email sent to {credentials.email}.
                </p>
            )}
            {credentials.email_sent === false && (
                <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">
                    The account was created, but the credentials email could not be sent. Save the ID number and password before closing, and check the mail configuration.
                </p>
            )}
            <dl className="space-y-3 text-sm">
                <div>
                    <dt className="font-medium">ID number</dt>
                    <dd className="break-all select-text">{credentials.user_id_no}</dd>
                </div>
                <div>
                    <dt className="font-medium">Email</dt>
                    <dd className="break-all select-text">{credentials.email}</dd>
                </div>
                <div>
                    <dt className="font-medium">Generated password</dt>
                    <dd className="flex items-center justify-between gap-3">
                        <span className="break-all font-mono select-text">
                            {showPassword ? credentials.password : "••••••••••••"}
                        </span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={showPassword ? "Hide generated password" : "Show generated password"}
                            aria-pressed={showPassword}
                            onClick={() => setShowPassword((current) => !current)}
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </Button>
                    </dd>
                </div>
            </dl>
        </section>
    );
}

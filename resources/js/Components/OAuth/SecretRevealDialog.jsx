import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import CopyButton from "@/Components/ui/CopyButton";

/**
 * Shows a newly issued client secret once. SIS-OCC stores only a hash of it.
 */
export default function SecretRevealDialog({ secret, appName }) {
    const [open, setOpen] = useState(Boolean(secret));

    useEffect(() => setOpen(Boolean(secret)), [secret]);

    if (!secret) return null;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <KeyRound className="h-5 w-5" />
                        Copy the client secret now
                    </DialogTitle>
                    <DialogDescription>
                        This is the only time SIS-OCC shows the secret for {appName}. Put it in the
                        app server's <code>.env</code> file. If it's lost, issue a new one.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-start gap-2 rounded-md border bg-muted p-3">
                    <code className="flex-1 break-all font-mono text-sm">{secret}</code>
                    <CopyButton text={secret} size="xs" />
                </div>

                <p className="text-sm text-muted-foreground">
                    Never put the secret in browser JavaScript, a mobile app or a Git repository.
                </p>

                <DialogFooter>
                    <Button onClick={() => setOpen(false)}>I've stored it</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

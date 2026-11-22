import { Plus, X } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Checkbox } from "@/Components/ui/checkbox";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { Switch } from "@/Components/ui/switch";
import { Textarea } from "@/Components/ui/textarea";

export const emptyApp = {
    name: "",
    description: "",
    homepage_url: "",
    redirect_uris: [""],
    confidential: true,
    scopes: ["profile", "enrollment"],
    allowed_roles: ["student"],
    requires_enrollment: true,
    skips_consent: true,
};

function FieldError({ message }) {
    return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

function firstError(errors, prefix) {
    const key = Object.keys(errors).find((k) => k === prefix || k.startsWith(`${prefix}.`));
    return key ? errors[key] : null;
}

/**
 * The settings MIS controls for one school app. Shared by "Register app" and the app page.
 */
export default function AppForm({ data, setData, errors, options, creating = false }) {
    const toggle = (field, value) => {
        const current = data[field];
        setData(field, current.includes(value) ? current.filter((v) => v !== value) : [...current, value]);
    };

    const setUri = (index, value) => {
        const next = [...data.redirect_uris];
        next[index] = value;
        setData("redirect_uris", next);
    };

    const studentsAllowed = data.allowed_roles.includes("student");

    return (
        <div className="space-y-6">
            <section className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="app-name">App name</Label>
                    <Input
                        id="app-name"
                        value={data.name}
                        onChange={(e) => setData("name", e.target.value)}
                        placeholder="OCC Library"
                        maxLength={100}
                    />
                    <p className="text-sm text-muted-foreground">Students see this name when they sign in.</p>
                    <FieldError message={errors.name} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="app-description">Description</Label>
                    <Textarea
                        id="app-description"
                        value={data.description ?? ""}
                        onChange={(e) => setData("description", e.target.value)}
                        placeholder="Borrow books and reserve study rooms."
                        maxLength={500}
                        rows={2}
                        className="block w-full"
                    />
                    <FieldError message={errors.description} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="app-homepage">Website</Label>
                    <Input
                        id="app-homepage"
                        value={data.homepage_url ?? ""}
                        onChange={(e) => setData("homepage_url", e.target.value)}
                        placeholder="https://library.occ.edu.ph"
                    />
                    <FieldError message={errors.homepage_url} />
                </div>
            </section>

            <section className="space-y-2">
                <Label>Callback URLs</Label>
                <p className="text-sm text-muted-foreground">
                    Where SIS-OCC may send people back after they sign in. Must match the app exactly. Use https;
                    plain http is only accepted for localhost and .test addresses.
                </p>
                <div className="space-y-2">
                    {data.redirect_uris.map((uri, index) => (
                        <div key={index} className="flex gap-2">
                            <Input
                                aria-label={`Callback URL ${index + 1}`}
                                value={uri}
                                onChange={(e) => setUri(index, e.target.value)}
                                placeholder="https://library.occ.edu.ph/auth/sis/callback"
                                className="font-mono text-sm"
                            />
                            {data.redirect_uris.length > 1 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Remove callback URL ${index + 1}`}
                                    onClick={() => setData("redirect_uris", data.redirect_uris.filter((_, i) => i !== index))}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
                {data.redirect_uris.length < 5 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setData("redirect_uris", [...data.redirect_uris, ""])}>
                        <Plus className="mr-1 h-4 w-4" /> Add callback URL
                    </Button>
                )}
                <FieldError message={firstError(errors, "redirect_uris")} />
            </section>

            {creating && (
                <section className="space-y-2">
                    <Label>How the app runs</Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                        {[
                            { value: true, title: "Has its own server", text: "Gets a client secret. Most web apps." },
                            { value: false, title: "No server", text: "Mobile or browser-only app. No secret; uses PKCE." },
                        ].map((option) => (
                            <label
                                key={String(option.value)}
                                className={`flex cursor-pointer gap-3 rounded-md border p-3 text-sm ${data.confidential === option.value ? "border-primary bg-primary/5" : ""}`}
                            >
                                <input
                                    type="radio"
                                    name="confidential"
                                    className="mt-1"
                                    checked={data.confidential === option.value}
                                    onChange={() => setData("confidential", option.value)}
                                />
                                <span>
                                    <span className="block font-medium">{option.title}</span>
                                    <span className="text-muted-foreground">{option.text}</span>
                                </span>
                            </label>
                        ))}
                    </div>
                    <FieldError message={errors.confidential} />
                </section>
            )}

            <section className="space-y-3">
                <div>
                    <Label>Who can sign in</Label>
                    <p className="text-sm text-muted-foreground">SIS-OCC refuses everyone else before the app gets any data.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {options.roles.map((role) => (
                        <label key={role.value} className="flex items-center gap-2 text-sm">
                            <Checkbox
                                aria-label={role.label}
                                checked={data.allowed_roles.includes(role.value)}
                                onCheckedChange={() => toggle("allowed_roles", role.value)}
                            />
                            {role.label}
                        </label>
                    ))}
                </div>
                <FieldError message={firstError(errors, "allowed_roles")} />

                <div className="flex items-start justify-between gap-4 rounded-md border p-3">
                    <div>
                        <Label htmlFor="requires-enrollment">Students must be enrolled this semester</Label>
                        <p className="text-sm text-muted-foreground">
                            {studentsAllowed
                                ? "Checks for an enrollment record in the current school year."
                                : "Only applies when students may sign in."}
                        </p>
                    </div>
                    <Switch
                        id="requires-enrollment"
                        checked={data.requires_enrollment}
                        onCheckedChange={(value) => setData("requires_enrollment", value)}
                    />
                </div>
            </section>

            <section className="space-y-3">
                <div>
                    <Label>What the app can read</Label>
                    <p className="text-sm text-muted-foreground">Grades, addresses, billing and parents' details are never shared.</p>
                </div>
                <div className="space-y-2">
                    {options.scopes.map((scope) => (
                        <label key={scope.id} className="flex items-start gap-2 text-sm">
                            <Checkbox
                                aria-label={scope.description}
                                className="mt-0.5"
                                checked={data.scopes.includes(scope.id)}
                                onCheckedChange={() => toggle("scopes", scope.id)}
                            />
                            <span>
                                <code className="mr-2 rounded bg-muted px-1.5 py-0.5 text-xs">{scope.id}</code>
                                {scope.description}
                            </span>
                        </label>
                    ))}
                </div>
                <FieldError message={firstError(errors, "scopes")} />
            </section>

            <section className="flex items-start justify-between gap-4 rounded-md border p-3">
                <div>
                    <Label htmlFor="skips-consent">School-owned app</Label>
                    <p className="text-sm text-muted-foreground">
                        Skip the "allow access?" screen. Turn this off for apps run by anyone outside the school.
                    </p>
                </div>
                <Switch
                    id="skips-consent"
                    checked={data.skips_consent}
                    onCheckedChange={(value) => setData("skips_consent", value)}
                />
            </section>
        </div>
    );
}

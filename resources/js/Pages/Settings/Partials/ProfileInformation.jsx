import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/Components/ui/alert';
import { Avatar, AvatarFallback } from '@/Components/ui/avatar';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { Separator } from '@/Components/ui/separator';
import {
    Cake,
    Contact,
    Hash,
    Info,
    LockKeyhole,
    Mail,
    MapPin,
    Phone,
    UserRound,
} from 'lucide-react';
import { formatDate, formatPhoneNumber } from '@/Lib/Utils';
import { formatName } from '@/Lib/InfoUtils';
import CopyButton from '@/Components/ui/CopyButton';

const asText = (value) => String(value ?? '').trim();

function formatOptionalValue(value, formatter) {
    const rawValue = asText(value);
    if (!rawValue) return '';

    try {
        return asText(formatter(rawValue)) || rawValue;
    } catch {
        // Keep the original value readable if a formatting helper rejects it.
        return rawValue;
    }
}

function InfoItem({ icon: Icon, label, value, href }) {
    const displayValue = asText(value);

    return (
        <div className="min-w-0">
            <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                {Icon && <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />}
                {label}
            </dt>

            <dd className="m-0 mt-1.5 min-w-0 text-sm font-medium leading-6 text-foreground [overflow-wrap:anywhere]">
                {!displayValue ? (
                    <span className="font-normal text-muted-foreground">Not provided</span>
                ) : href ? (
                    <Button
                        asChild
                        variant="link"
                        className="h-auto min-h-[44px] max-w-full justify-start whitespace-normal px-0 py-1 text-left text-sm font-medium leading-6 text-primary"
                    >
                        <a href={href} className="min-w-0 [overflow-wrap:anywhere]">
                            {displayValue}
                        </a>
                    </Button>
                ) : (
                    <span className="whitespace-pre-line">{displayValue}</span>
                )}
            </dd>
        </div>
    );
}

export default function ProfileInformation({ userInfo }) {
    const info = userInfo ?? {};
    const firstName = asText(info.first_name);
    const middleName = asText(info.middle_name);
    const lastName = asText(info.last_name);
    const fallbackName = [firstName, middleName, lastName].filter(Boolean).join(' ');
    const fullName = fallbackName
        ? asText(formatName(
            { ...info, first_name: firstName, middle_name: middleName, last_name: lastName },
            { format: 'FULL', casing: 'upper' },
        )) || fallbackName
        : 'Name not provided';

    const initials = ((firstName[0] || '') + (lastName[0] || '')).toUpperCase() || 'U';
    const userId = asText(info.user_id_no);
    const email = asText(info.email);
    const contactNumber = asText(info.contact_number);
    const phoneDigits = contactNumber.replace(/[^+\d]/g, '');
    const phoneHref = /\d/.test(phoneDigits) ? 'tel:' + phoneDigits : undefined;
    const birthday = formatOptionalValue(info.birthday, formatDate);
    const formattedPhone = formatOptionalValue(contactNumber, formatPhoneNumber);

    return (
        <Card className="w-full min-w-0 gap-0 overflow-hidden rounded-2xl py-0 shadow-sm">
            <CardHeader className="border-b bg-muted/20 p-5 sm:p-6 PT-0 mt-0">
                <div className="flex min-w-0 flex-col items-center gap-4 text-center sm:flex-row sm:gap-5 sm:text-left">
                    <Avatar aria-hidden="true" className="h-20 w-20 shrink-0 border-4 border-background shadow-sm">
                        <AvatarFallback className="bg-primary/10 text-2xl font-semibold text-primary">
                            {initials}
                        </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1 space-y-3">
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">
                                Personal profile
                            </p>
                            <CardTitle className="text-xl font-semibold leading-snug tracking-tight sm:text-2xl [overflow-wrap:anywhere]">
                                {fullName}
                            </CardTitle>
                        </div>

                        <div className="flex max-w-full flex-wrap items-center justify-center gap-2 sm:justify-start">
                            <div className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-lg border bg-background px-3 py-1.5">
                                <span className="shrink-0 text-xs text-muted-foreground">ID</span>
                                <span className="min-w-0 font-mono text-xs font-medium [overflow-wrap:anywhere]">
                                    {userId || 'Not provided'}
                                </span>
                                {userId && (
                                    <span className="shrink-0">
                                        <CopyButton text={userId} />
                                    </span>
                                )}
                            </div>

                            <Badge variant="outline" className="gap-1.5 rounded-full bg-background px-2.5 py-1 text-xs font-normal text-muted-foreground">
                                <LockKeyhole aria-hidden="true" className="h-3 w-3" />
                                View only
                            </Badge>
                        </div>

                        <CardDescription className="text-sm leading-relaxed">
                            Your personal details and contact information.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-7 p-5 sm:p-6">
                <section className="space-y-3">
                    <div className="flex items-center gap-2">
                        <UserRound aria-hidden="true" className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold tracking-tight">Personal details</h3>
                    </div>

                    <div className="rounded-xl border bg-card p-4 sm:p-5">
                        <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
                            <InfoItem label="First name" value={firstName} />
                            <InfoItem label="Middle name" value={middleName} />
                            <InfoItem label="Last name" value={lastName} />
                            <InfoItem label="Gender" value={info.gender} />
                            <InfoItem icon={Cake} label="Birthday" value={birthday} />
                        </dl>
                    </div>
                </section>

                <section className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Contact aria-hidden="true" className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold tracking-tight">Contact & location</h3>
                    </div>

                    <div className="rounded-xl border bg-card p-4 sm:p-5">
                        <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                            <InfoItem
                                icon={Mail}
                                label="Email address"
                                value={email}
                                href={email ? 'mailto:' + encodeURIComponent(email) : undefined}
                            />
                            <InfoItem
                                icon={Phone}
                                label="Contact number"
                                value={formattedPhone}
                                href={phoneHref}
                            />
                        </dl>

                        <Separator className="my-5" />

                        <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-[minmax(0,1fr)_140px]">
                            <InfoItem icon={MapPin} label="Present address" value={info.present_address} />
                            <InfoItem icon={Hash} label="ZIP code" value={info.zip_code} />
                        </dl>
                    </div>
                </section>
            </CardContent>

            <CardFooter className="block border-t bg-muted/10 px-5 py-5 sm:px-6">
                <Alert role="note" className="rounded-xl border-primary/20 bg-primary/5 [&>svg]:text-primary">
                    <Info aria-hidden="true" className="h-4 w-4" />
                    <AlertTitle className="font-medium">Need to update your information?</AlertTitle>
                    <AlertDescription className="text-sm leading-relaxed text-muted-foreground">
                        Contact your administrator to request updates or corrections.
                        Profile changes require verification.
                    </AlertDescription>
                </Alert>
            </CardFooter>
        </Card>
    );
}


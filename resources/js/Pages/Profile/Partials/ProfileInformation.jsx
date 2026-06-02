import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import {
    Mail,
    Phone,
    MapPin,
    User,
    Cake,
    Hash,
    ShieldAlert
} from 'lucide-react';
import { formatDate, formatPhoneNumber } from '@/Lib/Utils';

export default function ProfileInformation({ userInfo }) {
    // Generate full name and initials for the header Avatar
    const fullName = [userInfo.first_name, userInfo.middle_name, userInfo.last_name]
        .filter(Boolean)
        .join(' ') || 'Unknown User';

    const initials = ((userInfo.first_name?.[0] || '') + (userInfo.last_name?.[0] || '')).toUpperCase();

    // Enhanced InfoItem with better styling and empty states
    const InfoItem = ({ icon: Icon, label, value }) => (
        <div className="flex items-start gap-4 p-4 rounded-xl border bg-muted/20 transition-colors hover:bg-muted/40">
            <div className="p-2 bg-background rounded-lg shadow-sm border flex-shrink-0">
                <Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-1 flex-1 overflow-hidden">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
                {value ? (
                    <p className="text-sm font-semibold truncate">{value}</p>
                ) : (
                    <p className="text-sm italic text-muted-foreground">Not provided</p>
                )}
            </div>
        </div>
    );

    return (
        <Card className="overflow-hidden border-0 shadow-md ring-1 ring-border">
            {/* Custom Header with Avatar */}
            <div className="bg-primary/5 border-b px-6 py-8 flex flex-col md:flex-row items-center gap-6">
                <div className="h-20 w-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold shadow-sm flex-shrink-0">
                    {initials || 'U'}
                </div>
                <div className="text-center md:text-left space-y-1.5">
                    <CardTitle className="text-2xl font-bold">{fullName}</CardTitle>
                    <CardDescription className="text-base text-foreground/80">
                        View your personal details and contact information.
                    </CardDescription>
                </div>
            </div>

            <CardContent className="p-6 space-y-8">
                {/* Personal Details Section */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold tracking-tight border-b pb-2">Personal Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        <InfoItem icon={User} label="First Name" value={userInfo.first_name} />
                        <InfoItem icon={User} label="Middle Name" value={userInfo.middle_name} />
                        <InfoItem icon={User} label="Last Name" value={userInfo.last_name} />
                        <InfoItem icon={User} label="Gender" value={userInfo.gender} />
                        <InfoItem
                            icon={Cake}
                            label="Birthday"
                            value={userInfo.birthday ? formatDate(userInfo.birthday) : null}
                        />
                    </div>
                </div>

                {/* Contact & Location Section */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold tracking-tight border-b pb-2">Contact & Location</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InfoItem icon={Mail} label="Email Address" value={userInfo.email} />
                        <InfoItem
                            icon={Phone}
                            label="Contact Number"
                            value={userInfo.contact_number ? formatPhoneNumber(userInfo.contact_number) : null}
                        />
                        <InfoItem icon={MapPin} label="Present Address" value={userInfo.present_address} />
                        <InfoItem icon={Hash} label="Zip Code" value={userInfo.zip_code} />
                    </div>
                </div>

                {/* Callout / Alert Box */}
                <div className="flex items-start gap-3 p-4 mt-6 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                    <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p className="text-sm leading-relaxed">
                        <strong>Need to update your information?</strong> For security reasons, changes to your profile must be verified. Please contact your administrator to request updates or corrections to your details.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
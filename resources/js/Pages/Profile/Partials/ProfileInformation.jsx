import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import {
    Mail,
    Phone,
    Calendar,
    MapPin,
    User
} from 'lucide-react';
import { formatDate, formatPhoneNumber } from '@/Lib/Utils';

export default function ProfileInformation({ userInfo }) {
    const InfoItem = ({ icon: Icon, label, value }) => (
        <div className="flex items-start gap-3 py-3">
            <Icon className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="space-y-1 flex-1">
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <p className="text-base">{value || 'Not provided'}</p>
            </div>
        </div>
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                    Your profile information is displayed below. Contact support to make changes.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <InfoItem
                            icon={User}
                            label="First Name"
                            value={userInfo.first_name}
                        />

                        <InfoItem
                            icon={User}
                            label="Middle Name"
                            value={userInfo.middle_name}
                        />

                        <InfoItem
                            icon={User}
                            label="Last Name"
                            value={userInfo.last_name}
                        />

                        <InfoItem
                            icon={Mail}
                            label="Email Address"
                            value={userInfo.email}
                        />
                    </div>

                    <div className="space-y-2">
                        <InfoItem
                            icon={Phone}
                            label="Contact Number"
                            value={formatPhoneNumber(userInfo.contact_number)}
                        />

                        <InfoItem
                            icon={User}
                            label="Gender"
                            value={userInfo.gender || 'Not specified'}
                        />

                        <InfoItem
                            icon={Calendar}
                            label="Birthday"
                            value={formatDate(userInfo.birthday)}
                        />

                        <InfoItem
                            icon={MapPin}
                            label="Zip Code"
                            value={userInfo.zip_code}
                        />
                    </div>
                </div>

                <div className="pt-4 border-t">
                    <InfoItem
                        icon={MapPin}
                        label="Present Address"
                        value={userInfo.present_address}
                    />
                </div>

                <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                        Need to update your information? Please contact our support team for assistance.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

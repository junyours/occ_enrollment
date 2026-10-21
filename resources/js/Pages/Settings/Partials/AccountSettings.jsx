import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Separator } from '@/Components/ui/separator';
import {
    User,
    Shield,
    Eye,
    CheckCircle,
    XCircle
} from 'lucide-react';
import { formatDate } from '@/Lib/Utils';

export default function AccountSettings({ userInfo, handleDataExport }) {
    return (
        <div className="grid gap-6">
            {/* Account Information */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Account Information
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex justify-between items-center">
                            <span className="font-medium">User ID:</span>
                            <Badge variant="outline">{userInfo.user_id_no}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-medium">Internal ID:</span>
                            <Badge variant="outline">{userInfo.user_id}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-medium">Email:</span>
                            <span className="text-muted-foreground">{userInfo.email}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-medium">Contact:</span>
                            <span className="text-muted-foreground">{userInfo.contact_number || 'Not provided'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-medium">Gender:</span>
                            <span className="text-muted-foreground">{userInfo.gender || 'Not specified'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-medium">Birthday:</span>
                            <span className="text-muted-foreground">{formatDate(userInfo.birthday)}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Security Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        Security Settings
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="font-medium">Two-Factor Authentication</span>
                            <div className="flex items-center gap-2">
                                <XCircle className="w-4 h-4 text-destructive" />
                                <span className="text-destructive">Disabled</span>
                            </div>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center">
                            <span className="font-medium">Login Notifications</span>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <span className="text-green-600">Enabled</span>
                            </div>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center">
                            <span className="font-medium">Password Last Changed</span>
                            <span className="text-muted-foreground">Recently</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Privacy Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Eye className="w-5 h-5" />
                        Privacy Settings
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="font-medium">Profile Visibility</span>
                            <Badge variant="secondary">Private</Badge>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center">
                            <span className="font-medium">Email Notifications</span>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <span className="text-green-600">Enabled</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

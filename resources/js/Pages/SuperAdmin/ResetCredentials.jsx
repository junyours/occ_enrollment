import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Input } from '@/Components/ui/input';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Label } from '@/Components/ui/label';
import { Separator } from '@/Components/ui/separator';
import { Badge } from '@/Components/ui/badge';
import { toast } from 'sonner';
import { router, usePage, Head } from '@inertiajs/react';
import { Search, User as UserIcon, Key, RefreshCw, ShieldAlert, Mail, Calendar } from 'lucide-react';
import axios from 'axios';
import UserRoleBadge from '@/Components/ui/UserRoleBadge'; // Using our previous component
import { cn } from '@/Lib/Utils';
import { Alert, AlertDescription } from '@/Components/ui/alert';

function ResetCredentials() {
    const [searchId, setSearchId] = useState('');
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [password, setPassword] = useState('');

    const { props } = usePage();

    useEffect(() => {
        if (props.flash?.success) toast.success(props.flash.success);
        if (props.errors?.user_id) toast.error(props.errors.user_id);
    }, [props.flash, props.errors]);

    const handleSearch = async (e) => {
        e?.preventDefault();
        if (!searchId.trim()) return;

        setLoading(true);
        try {
            const res = await axios.post(route('super-admin.search-user', { user_id_no: searchId }));
            setUser(res.data.user);
            setPassword(''); // Clear password field on new search
        } catch (error) {
            toast.error(error.response?.data?.message || 'User not found.');
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        if (!user) return;
        router.post(route('super-admin.reset-user-credentials'),
            { user_id: user.id, email_address: user.email },
            {
                preserveScroll: true,
                onStart: () => setLoading(true),
                onFinish: () => setLoading(false)
            }
        );
    };

    const changePassword = () => {
        if (!user || !password) return toast.error("Please enter a new password");
        router.post(route('super-admin.change-user-password'),
            { user_id: user.id, password: password },
            {
                preserveScroll: true,
                onStart: () => setLoading(true),
                onFinish: () => setLoading(false)
            }
        );
    };

    return (
        <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
            <Head title="Account Security" />

            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold tracking-tight">Account Security</h1>
                <p className="text-muted-foreground text-sm">Search for a user to manage their credentials and access.</p>
            </div>

            {/* Search Section */}
            <Card className="shadow-sm border-primary/10">
                <CardContent className="pt-6">
                    <form onSubmit={handleSearch} className="flex items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                className="pl-10 h-11"
                                placeholder="Search by User ID No. (e.g. 2024-0001)"
                                value={searchId}
                                onChange={(e) => setSearchId(e.target.value)}
                            />
                        </div>
                        <Button type="submit" size="lg" disabled={loading} className="px-8">
                            {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                            Search
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {!user ? (
                // Empty State
                <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed rounded-xl opacity-50">
                    <UserIcon className="h-12 w-12 mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium text-muted-foreground">No user selected</p>
                    <p className="text-sm text-muted-foreground">Enter a valid User ID above to begin management.</p>
                </div>
            ) : (
                <div className="grid gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {/* User Profile Overview */}
                    <Card>
                        <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-4">
                            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                                <UserIcon className="h-8 w-8 text-primary" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-xl">
                                        {user.first_name} {user.last_name}
                                    </CardTitle>
                                    <UserRoleBadge role={user.role} />
                                </div>
                                <CardDescription className="flex items-center gap-4 mt-1">
                                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {user.email}</span>
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        Joined: {user.first_login_at ? new Date(user.first_login_at).toLocaleDateString() : 'Never logged in'}
                                    </span>
                                </CardDescription>
                            </div>
                        </CardHeader>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Action 1: Password Change */}
                        <Card className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Key className="h-5 w-5 text-blue-500" />
                                    Manual Password Update
                                </CardTitle>
                                <CardDescription>Directly overwrite the user's current password.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 mt-auto">
                                <div className="space-y-2">
                                    <Label htmlFor="new-password">New Password</Label>
                                    <Input
                                        id="new-password"
                                        type="text" // Set to text so admin can see what they are typing
                                        placeholder="Enter secure password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={loading}
                                    />
                                </div>
                                <Button className="w-full" onClick={changePassword} disabled={loading || !password}>
                                    Update Password
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Action 2: Hard Reset */}
                        <Card className="border-destructive/20 bg-destructive/5 flex flex-col">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                                    <ShieldAlert className="h-5 w-5" />
                                    Account Reset
                                </CardTitle>
                                <CardDescription>
                                    Wipe login credentials. The user will need to re-verify via email.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="mt-auto">
                                <Alert variant="destructive" className="bg-white/50 dark:bg-black/20 border-destructive/20 mb-4">
                                    <AlertDescription className="text-xs">
                                        This action is irreversible. Use only if the account is compromised or lost.
                                    </AlertDescription>
                                </Alert>
                                <Button
                                    variant="destructive"
                                    className="w-full"
                                    onClick={handleReset}
                                    disabled={loading}
                                >
                                    Force Account Reset
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ResetCredentials;
ResetCredentials.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
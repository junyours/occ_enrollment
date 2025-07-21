import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Input } from '@/Components/ui/input';
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import { Label } from '@/Components/ui/label';
import { toast } from 'sonner';
import { router, usePage } from '@inertiajs/react';
import axios from 'axios';

function ResetCredentials() {
    const [searchId, setSearchId] = useState('');
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);

    const { props } = usePage();

    useEffect(() => {
        if (props.flash?.success) {
            toast.success(props.flash.success);
        }
        if (props.errors?.user_id) {
            toast.error(props.errors.user_id);
        }
    }, [props.flash, props.errors]);

    const handleSearch = async () => {
        if (!searchId.trim()) return;

        setLoading(true);
        try {
            const res = await axios.post(route('super-admin.search-user', { user_id_no: searchId }));
            setUser(res.data.user);
        } catch (error) {
            toast.error(error.response?.data?.message || 'User not found.');
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        if (!user) return;

        router.post(
            route('super-admin.reset-user-credentials'),
            {
                user_id: user.id,
                email_address: user.email,
            },
            {
                preserveScroll: true,
                preserveState: true,
            }
        );
    };

    return (
        <div className="p-6 max-w-xl mx-auto">
            <h1 className="text-2xl font-semibold mb-4">Reset User Credentials</h1>

            <div className="flex items-center gap-2 mb-6">
                <Input
                    placeholder="Enter User ID No"
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                />
                <Button onClick={handleSearch} disabled={loading}>
                    {loading ? 'Searching...' : 'Search'}
                </Button>
            </div>

            {user && (
                <Card>
                    <CardContent className="space-y-4 py-4">
                        <div>
                            <Label>Email</Label>
                            <div>{user.email || 'N/A'}</div>
                        </div>
                        <div>
                            <Label>First Login</Label>
                            <div>{user.first_login_at || 'N/A'}</div>
                        </div>
                        <div>
                            <Label>Full Name</Label>
                            <div>
                                {user.first_name} {user.middle_name ? user.middle_name + ' ' : ''}{user.last_name}
                            </div>
                        </div>

                        <Button variant="destructive" onClick={handleReset}>
                            Reset Credentials
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default ResetCredentials;

ResetCredentials.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;

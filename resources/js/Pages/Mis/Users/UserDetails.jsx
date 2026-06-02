import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from '@inertiajs/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Input } from '@/Components/ui/input';
import { Button } from '@/Components/ui/button';
import { Label } from '@/Components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/Components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { AlertCircle, Edit2, Save, X, User, Shield, Phone } from 'lucide-react';
import { toast } from 'sonner';
import UserRoleBadge from '@/Components/ui/UserRoleBadge';

export default function UserDetailsDialog({ selectedUser, setSelectedUser }) {
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState('details');

    const { data, setData, put, processing, errors, reset } = useForm({
        user_id_no: '',
        user_role: '',
        first_name: '',
        last_name: '',
        middle_name: '',
        gender: '',
        birthday: '',
        civil_status: '',
        contact_number: '',
        email: '',
        present_address: '',
        zip_code: '',
    });

    const mapUserData = useCallback((user) => {
        if (!user) return;
        setData({
            user_id_no: user.user_id_no ?? '',
            user_role: user.user_role ?? '',
            first_name: user.first_name ?? '',
            last_name: user.last_name ?? '',
            middle_name: user.middle_name ?? '',
            gender: user.gender ?? '',
            birthday: user.birthday ?? '',
            civil_status: user.civil_status ?? '',
            contact_number: user.contact_number ?? '',
            email: user.email ?? '',
            present_address: user.present_address ?? '',
            zip_code: user.zip_code ?? '',
        });
    }, [setData]);

    useEffect(() => {
        if (selectedUser) {
            mapUserData(selectedUser);
            setIsEditing(false);
            setActiveTab('details');
        }
    }, [selectedUser, mapUserData]);

    const handleSubmit = (e) => {
        e.preventDefault();
        put(route('mis-users.update', selectedUser.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success("User details updated successfully.");
                setIsEditing(false);
            },
        });
    };

    const handleCancel = () => {
        mapUserData(selectedUser);
        setIsEditing(false);
    };

    const handleClose = () => {
        setSelectedUser(null);
        setIsEditing(false);
        reset();
    };

    const hasPersonalInfo = selectedUser?.first_name || selectedUser?.last_name;
    const displayName = hasPersonalInfo
        ? `${data.first_name} ${data.last_name}`.trim()
        : (data.user_id_no || 'Unknown User');

    return (
        <Dialog open={!!selectedUser} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] h-[28rem] overflow-y-auto flex flex-col p-0 gap-2">
                {/* STICKY HEADER */}
                <DialogHeader className="sticky top-0 bg-background/95 backdrop-blur z-20 p-6 border-b">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <User className="h-6 w-6" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl">{displayName}</DialogTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {data.email || 'No email provided'}
                                </p>
                            </div>
                        </div>

                        {/* EDIT BUTTON (Only shows when NOT editing) */}
                        {!isEditing && (
                            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                                <Edit2 className="h-4 w-4 mr-2" /> Edit Profile
                            </Button>
                        )}
                    </div>
                </DialogHeader>

                <div className="p-6 pt-2 space-y-6 flex-grow">
                    {/* GLOBAL WARNING ALERT */}
                    {!hasPersonalInfo && !isEditing && selectedUser && (
                        <Alert variant="warning" className="bg-amber-50 border-amber-200 mt-4">
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                            <AlertTitle className="text-amber-800">Incomplete Profile</AlertTitle>
                            <AlertDescription className="text-amber-700">
                                This account profile is missing personal information. Please edit the profile to update these details.
                            </AlertDescription>
                        </Alert>
                    )}

                    {selectedUser && (
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-3 mb-4">
                                <TabsTrigger value="details" className="flex gap-2">
                                    <Shield className="h-4 w-4" /> Account
                                </TabsTrigger>
                                <TabsTrigger value="personal" className="flex gap-2">
                                    <User className="h-4 w-4" /> Personal
                                </TabsTrigger>
                                <TabsTrigger value="contact" className="flex gap-2">
                                    <Phone className="h-4 w-4" /> Contact
                                </TabsTrigger>
                            </TabsList>

                            {/* ACCOUNT TAB */}
                            <TabsContent value="details" className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1">
                                    <div className="space-y-2">
                                        <Label>User ID No.</Label>
                                        <Input
                                            value={data.user_id_no}
                                            disabled={!isEditing}
                                            onChange={e => setData('user_id_no', e.target.value)}
                                            className={errors.user_id_no ? 'border-destructive' : 'disabled:opacity-80 disabled:bg-muted/50'}
                                        />
                                        {errors.user_id_no && <p className="text-xs text-destructive">{errors.user_id_no}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label>User Role</Label>
                                        {/* ROLE IS NOW ALWAYS READ-ONLY */}
                                        <div className="h-10 flex items-center">
                                            <UserRoleBadge role={data.user_role} />
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* PERSONAL TAB */}
                            <TabsContent value="personal" className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-1">
                                    <div className="space-y-2">
                                        <Label>First Name</Label>
                                        <Input
                                            disabled={!isEditing}
                                            value={data.first_name}
                                            onChange={e => setData('first_name', e.target.value)}
                                            className="disabled:opacity-80 disabled:bg-muted/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Middle Name</Label>
                                        <Input
                                            disabled={!isEditing}
                                            value={data.middle_name}
                                            onChange={e => setData('middle_name', e.target.value)}
                                            className="disabled:opacity-80 disabled:bg-muted/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Last Name</Label>
                                        <Input
                                            disabled={!isEditing}
                                            value={data.last_name}
                                            onChange={e => setData('last_name', e.target.value)}
                                            className="disabled:opacity-80 disabled:bg-muted/50"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-1 mt-2">
                                    <div className="space-y-2">
                                        <Label>Gender</Label>
                                        <Select
                                            disabled={!isEditing}
                                            value={data.gender}
                                            onValueChange={val => setData('gender', val)}
                                        >
                                            <SelectTrigger className="disabled:opacity-80 disabled:bg-muted/50">
                                                <SelectValue placeholder="Select gender" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Male">Male</SelectItem>
                                                <SelectItem value="Female">Female</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Birthday</Label>
                                        <Input
                                            type="date"
                                            disabled={!isEditing}
                                            value={data.birthday}
                                            onChange={e => setData('birthday', e.target.value)}
                                            className="disabled:opacity-80 disabled:bg-muted/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Civil Status</Label>
                                        <Select
                                            disabled={!isEditing}
                                            value={data.civil_status}
                                            onValueChange={val => setData('civil_status', val)}
                                        >
                                            <SelectTrigger className="disabled:opacity-80 disabled:bg-muted/50">
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="single">Single</SelectItem>
                                                <SelectItem value="married">Married</SelectItem>
                                                <SelectItem value="widowed">Widowed</SelectItem>
                                                <SelectItem value="divorced">Divorced</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* CONTACT TAB */}
                            <TabsContent value="contact" className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
                                    <div className="space-y-2">
                                        <Label>Email Address</Label>
                                        <Input
                                            type="email"
                                            disabled={!isEditing}
                                            value={data.email}
                                            onChange={e => setData('email', e.target.value)}
                                            className="disabled:opacity-80 disabled:bg-muted/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Contact Number</Label>
                                        <Input
                                            type="tel"
                                            disabled={!isEditing}
                                            value={data.contact_number}
                                            onChange={e => setData('contact_number', e.target.value)}
                                            className="disabled:opacity-80 disabled:bg-muted/50"
                                            placeholder="+1 (555) 000-0000"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-1 mt-2">
                                    <div className="space-y-2 md:col-span-3">
                                        <Label>Present Address</Label>
                                        <Input
                                            disabled={!isEditing}
                                            value={data.present_address}
                                            onChange={e => setData('present_address', e.target.value)}
                                            className="disabled:opacity-80 disabled:bg-muted/50"
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-1">
                                        <Label>Zip Code</Label>
                                        <Input
                                            disabled={!isEditing}
                                            value={data.zip_code}
                                            onChange={e => setData('zip_code', e.target.value)}
                                            className="disabled:opacity-80 disabled:bg-muted/50"
                                        />
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    )}
                </div>

                {/* STICKY FOOTER FOR ACTIONS */}
                {isEditing && (
                    <DialogFooter className="sticky bottom-0 bg-background/95 backdrop-blur border-t p-6 py-4 z-20">
                        <div className="flex justify-end gap-3 w-full">
                            <Button variant="outline" onClick={handleCancel} disabled={processing}>
                                <X className="h-4 w-4 mr-2" /> Cancel
                            </Button>
                            <Button onClick={handleSubmit} disabled={processing}>
                                <Save className="h-4 w-4 mr-2" />
                                {processing ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
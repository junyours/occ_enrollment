import React, { useState, useEffect } from 'react';
import { router, useForm } from '@inertiajs/react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/Components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import { Input } from '@/Components/ui/input';
import { Button } from '@/Components/ui/button';
import { Label } from '@/Components/ui/label';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { Badge } from '@/Components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { AlertCircle, Edit2, Save, X } from 'lucide-react';
import { formatRole, getRoleBadgeColor } from './Utility';
import { userRoles } from '@/Lib/Utils';
import { toast } from 'sonner';

export default function UserDetailsDialog({ selectedUser, setSelectedUser }) {
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState('details');

    const { data, setData, put, processing, errors, reset } = useForm({
        // User credentials
        user_id_no: '',
        user_role: '',
        // Personal Information
        first_name: '',
        last_name: '',
        middle_name: '',
        gender: '',
        birthday: null,
        civil_status: null,
        // Contact Information
        contact_number: '',
        email: '',
        present_address: null,
        zip_code: null,
    });

    useEffect(() => {
        0
        if (selectedUser) {
            setData({
                user_id_no: selectedUser.user_id_no || '',
                user_role: selectedUser.user_role || '',
                first_name: selectedUser.first_name || '',
                last_name: selectedUser.last_name || '',
                middle_name: selectedUser.middle_name || '',
                gender: selectedUser.gender || '',
                birthday: selectedUser.birthday || null,
                civil_status: selectedUser.civil_status || null,
                contact_number: selectedUser.contact_number || '',
                email: selectedUser.email || '',
                present_address: selectedUser.present_address || null,
                zip_code: selectedUser.zip_code || null,
            });
            setIsEditing(false);
        }
    }, [selectedUser]);

    const genderOptions = [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
    ];

    const civilStatusOptions = [
        { value: 'single', label: 'Single' },
        { value: 'married', label: 'Married' },
        { value: 'widowed', label: 'Widowed' },
        { value: 'separated', label: 'Separated' },
        { value: 'divorced', label: 'Divorced' },
    ];

    const handleSubmit = () => {
        console.log(data);

        router.put(
            route('mis-users.update', selectedUser.id),
            data,
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success("User details updated successfully.");
                },
                onFinish: () => setIsEditing(false),
            }
        );
    };

    const handleCancel = () => {
        if (selectedUser) {
            setData({
                user_id_no: selectedUser.user_id_no || '',
                user_role: selectedUser.user_role || '',
                first_name: selectedUser.first_name || '',
                last_name: selectedUser.last_name || '',
                middle_name: selectedUser.middle_name || '',
                gender: selectedUser.gender || '',
                birthday: selectedUser.birthday || null,
                civil_status: selectedUser.civil_status || null,
                contact_number: selectedUser.contact_number || '',
                email: selectedUser.email || '',
                present_address: selectedUser.present_address || null,
                zip_code: selectedUser.zip_code || null,
            });
        }
        setIsEditing(false);
    };

    const handleClose = () => {
        setSelectedUser(null);
        setIsEditing(false);
        reset();
    };

    const hasPersonalInfo = selectedUser?.first_name || selectedUser?.last_name || selectedUser?.email;

    return (
        <Dialog open={!!selectedUser} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] h-96 overflow-y-auto flex flex-col">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle>User Details</DialogTitle>
                        {!isEditing ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsEditing(true)}
                            >
                                <Edit2 className="h-4 w-4 mr-2" />
                                Edit
                            </Button>
                        ) : (
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCancel}
                                    disabled={processing}
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleSubmit}
                                    disabled={processing}
                                >
                                    <Save className="h-4 w-4 mr-2" />
                                    {processing ? 'Saving...' : 'Save'}
                                </Button>
                            </div>
                        )}
                    </div>
                </DialogHeader>

                {selectedUser && (
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="details">Account</TabsTrigger>
                            <TabsTrigger value="personal">Personal</TabsTrigger>
                            <TabsTrigger value="contact">Contact</TabsTrigger>
                        </TabsList>

                        <TabsContent value="details" className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>User ID</Label>
                                    {isEditing ? (
                                        <Input
                                            value={data.user_id_no}
                                            onChange={(e) => setData('user_id_no', e.target.value)}
                                            className={errors.user_id_no ? 'border-red-500' : ''}
                                        />
                                    ) : (
                                        <p className="text-base mt-2">{data.user_id_no}</p>
                                    )}
                                    {errors.user_id_no && (
                                        <p className="text-sm text-red-500 mt-1">{errors.user_id_no}</p>
                                    )}
                                </div>
                                <div>
                                    <Label>Role</Label>
                                    {isEditing ? (
                                        <Select value={data.user_role} onValueChange={(value) => setData('user_role', value)}>
                                            <SelectTrigger className={errors.user_role ? 'border-red-500' : ''}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {userRoles().map((role) => (
                                                    <SelectItem key={role.value} value={role.value}>
                                                        {role.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <div className="mt-2">
                                            <Badge className={`${getRoleBadgeColor(data.user_role)} text-white`}>
                                                {formatRole(data.user_role)}
                                            </Badge>
                                        </div>
                                    )}
                                    {errors.user_role && (
                                        <p className="text-sm text-red-500 mt-1">{errors.user_role}</p>
                                    )}
                                </div>
                            </div>

                            {!hasPersonalInfo && !isEditing && (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        This user has no personal information. Click "Edit" to add their details.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </TabsContent>

                        <TabsContent value="personal" className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>First Name</Label>
                                    {isEditing ? (
                                        <Input
                                            value={data.first_name}
                                            onChange={(e) => setData('first_name', e.target.value)}
                                            placeholder="Enter first name"
                                            className={errors.first_name ? 'border-red-500' : ''}
                                        />
                                    ) : (
                                        <p className="text-base mt-2">{data.first_name || 'N/A'}</p>
                                    )}
                                    {errors.first_name && (
                                        <p className="text-sm text-red-500 mt-1">{errors.first_name}</p>
                                    )}
                                </div>
                                <div>
                                    <Label>Last Name</Label>
                                    {isEditing ? (
                                        <Input
                                            value={data.last_name}
                                            onChange={(e) => setData('last_name', e.target.value)}
                                            placeholder="Enter last name"
                                            className={errors.last_name ? 'border-red-500' : ''}
                                        />
                                    ) : (
                                        <p className="text-base mt-2">{data.last_name || 'N/A'}</p>
                                    )}
                                    {errors.last_name && (
                                        <p className="text-sm text-red-500 mt-1">{errors.last_name}</p>
                                    )}
                                </div>
                                <div>
                                    <Label>Middle Name</Label>
                                    {isEditing ? (
                                        <Input
                                            value={data.middle_name}
                                            onChange={(e) => setData('middle_name', e.target.value)}
                                            placeholder="Enter middle name"
                                        />
                                    ) : (
                                        <p className="text-base mt-2">{data.middle_name || 'N/A'}</p>
                                    )}
                                </div>
                                <div>
                                    <Label>Gender</Label>
                                    {isEditing ? (
                                        <Select value={data.gender} onValueChange={(value) => setData('gender', value)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select gender" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {genderOptions.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <p className="text-base mt-2 capitalize">{data.gender || 'N/A'}</p>
                                    )}
                                </div>
                                <div>
                                    <Label>Birthday</Label>
                                    {isEditing ? (
                                        <Input
                                            type="date"
                                            value={data.birthday}
                                            onChange={(e) => setData('birthday', e.target.value)}
                                        />
                                    ) : (
                                        <p className="text-base mt-2">{data.birthday || 'N/A'}</p>
                                    )}
                                </div>
                                <div>
                                    <Label>Civil Status</Label>
                                    {isEditing ? (
                                        <Select value={data.civil_status} onValueChange={(value) => setData('civil_status', value)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select civil status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {civilStatusOptions.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <p className="text-base mt-2 capitalize">{data.civil_status || 'N/A'}</p>
                                    )}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="contact" className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Email Address</Label>
                                    {isEditing ? (
                                        <Input
                                            type="email"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            placeholder="Enter email address"
                                            className={errors.email ? 'border-red-500' : ''}
                                        />
                                    ) : (
                                        <p className="text-base mt-2">{data.email || 'N/A'}</p>
                                    )}
                                    {errors.email && (
                                        <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                                    )}
                                </div>
                                <div>
                                    <Label>Contact Number</Label>
                                    {isEditing ? (
                                        <Input
                                            value={data.contact_number}
                                            onChange={(e) => setData('contact_number', e.target.value)}
                                            placeholder="Enter contact number"
                                        />
                                    ) : (
                                        <p className="text-base mt-2">{data.contact_number || 'N/A'}</p>
                                    )}
                                </div>
                                <div className="col-span-2">
                                    <Label>Present Address</Label>
                                    {isEditing ? (
                                        <Input
                                            value={data.present_address}
                                            onChange={(e) => setData('present_address', e.target.value)}
                                            placeholder="Enter present address"
                                        />
                                    ) : (
                                        <p className="text-base mt-2">{data.present_address || 'N/A'}</p>
                                    )}
                                </div>
                                <div>
                                    <Label>Zip Code</Label>
                                    {isEditing ? (
                                        <Input
                                            value={data.zip_code}
                                            onChange={(e) => setData('zip_code', e.target.value)}
                                            placeholder="Enter zip code"
                                        />
                                    ) : (
                                        <p className="text-base mt-2">{data.zip_code || 'N/A'}</p>
                                    )}
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                )}
            </DialogContent>
        </Dialog>
    );
}
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import React from 'react'
import { Button } from '@/components/ui/button'
import { LogIn } from 'lucide-react'
import { router } from '@inertiajs/react'
import UserRoleBadge from '@/components/ui/UserRoleBadge'
import { Card, CardContent } from '@/components/ui/card'

function UsersTable({ users }) {

    const loginAs = (user) => {
        router.post(`/impersonate/${user.id}`);
    };
    return (
        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                    No users found
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.data.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.user_id_no}</TableCell>
                                    <TableCell>
                                        {user.first_name && user.last_name
                                            ? `${user.first_name} ${user.last_name}`
                                            : <span className="text-gray-400 italic">No information</span>
                                        }
                                    </TableCell>
                                    <TableCell>
                                        {user.email || <span className="text-gray-400 italic">No email</span>}
                                    </TableCell>
                                    <TableCell>
                                        <UserRoleBadge role={user.user_role} />
                                    </TableCell>
                                    <TableCell>
                                        {user.contact_number || <span className="text-gray-400 italic">No contact</span>}
                                    </TableCell>

                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" className="h-max py-1" size="icon" onClick={() => loginAs(user)}>
                                                <LogIn />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}

export default UsersTable
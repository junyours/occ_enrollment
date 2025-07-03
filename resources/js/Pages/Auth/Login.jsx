import GuestLayout from '@/Layouts/GuestLayout';
import { useForm } from '@inertiajs/react';
import OCC_LOGO from '../../../images/OCC_LOGO.png';
import { useState } from 'react';
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Head } from '@inertiajs/react';
import LoginStudents from '../../../images/Login_Students.png';
import {
    Card,
    CardContent,
} from "@/Components/ui/card";
import { Input } from "@/Components/ui/input";
import { Button } from "@/Components/ui/button";
import { Alert, AlertTitle } from '@/Components/ui/alert';
import { CheckCircle2Icon } from 'lucide-react';

export default function Login({ status }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        user_id_no: '',
        password: '',
        remember: false,
    });

    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const submit = (e) => {
        e.preventDefault();
        setSubmitting(true);

        post(route('login'), {
            onFinish: () => {
                reset('password');
                setSubmitting(false);
            },
        });
    };

    return (
        <GuestLayout>
            <Head title="Login" />
            {status && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
                    <Alert className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg backdrop-blur-sm border-l-4 border-l-green-500">
                        <div className='flex gap-2 items-center'>
                            <CheckCircle2Icon className="h-4 w-4 text-green-600" />
                            <AlertTitle className="text-green-700 font-medium mb-0">
                                {status}
                            </AlertTitle>
                        </div>
                    </Alert>
                </div>
            )}
            <Card className='md:grid md:grid-cols-2 gap-4 p-0 md:p-6 border-0 shadow-2xl'>
                <div className='flex flex-col items-center'>
                    <div className='flex gap-2 items-center'>
                        <h2 className='text-2xl font-semibold text-blue-800 hidden md:block'>Opol Community College</h2>
                    </div>
                    <p className='text-gray-600 text-center h-4 text-sm hidden md:block'>
                        Empowering students with quality education.
                    </p>
                    <p className='text-gray-600 text-center h-4 text-sm hidden md:block'>
                        Fostering a future of success.
                    </p>
                    <p className='text-gray-600 text-center h-4 text-sm hidden md:block'>
                        Excellence, innovation, and dedication always.
                    </p>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                        <img
                            src={LoginStudents}
                            alt="students"
                            className='w-60 rounded-lg shadow-sm mt-8 hidden md:block '
                            draggable="false"
                            onContextMenu={(e) => e.preventDefault()}
                        />
                        <div
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'transparent',
                                zIndex: 1,
                            }}
                        />
                    </div>
                </div>

                <Card className="w-80 h-96 items-center p-4 flex shadow-md">
                    <CardContent className="flex flex-col items-center p-0 w-full">
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                            <img
                                src={OCC_LOGO}
                                onContextMenu={(e) => e.preventDefault()}
                                alt="occ-logo"
                                draggable="false"
                                className='w-20'
                            />
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    background: 'transparent',
                                    zIndex: 1,
                                }}
                            />
                        </div>
                        <h1 className='text-2xl font-semibold'>USER LOGIN</h1>

                        <form onSubmit={submit} className="w-full space-y-4 mt-4">
                            <div className="space-y-2">
                                <Input
                                    type="text"
                                    id="user_id_no"
                                    name="user_id_no"
                                    value={data.user_id_no}
                                    onChange={(e) => setData('user_id_no', e.target.value)}
                                    placeholder="ID NUMBER"
                                    required
                                />
                                {errors.user_id_no && <p className="text-red-500 text-sm">{errors.user_id_no}</p>}
                            </div>
                            <div className="space-y-2">
                                <div className="relative">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        id="password"
                                        name="password"
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        placeholder="PASSWORD"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(prev => !prev)}
                                        className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        {showPassword ? <FaEye size={20} /> : <FaEyeSlash size={20} />}
                                    </button>
                                </div>
                                {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
                            </div>

                            <Button
                                type="submit"
                                disabled={processing || submitting}
                                className="w-full"
                            >
                                {submitting ? 'Logging in...' : 'Login'}
                            </Button>
                        </form>
                        <div className="mt-4 text-sm text-center">
                            <a href="/forgot-password">
                                <Button
                                    variant="link"
                                    className="text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                    FORGOT PASSWORD?
                                </Button>
                            </a>
                        </div>
                    </CardContent>
                </Card>
            </Card>
        </GuestLayout>
    );
}

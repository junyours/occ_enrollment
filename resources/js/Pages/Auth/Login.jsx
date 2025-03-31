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
    CardHeader,
    CardTitle,
} from "@/Components/ui/card";
import { Input } from "@/Components/ui/input";
import { Button } from "@/Components/ui/button";

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
                <div className="mb-4 text-sm font-medium text-green-600">
                    {status}
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
                    <img src={LoginStudents} alt="students" className='w-60 rounded-lg shadow-sm mt-8 hidden md:block ' />
                </div>

                <Card className="w-80 h-96 items-center p-4 flex shadow-md">
                    <CardContent className="flex flex-col items-center p-0 w-full">
                        <img src={OCC_LOGO} alt="students" className='w-20' />
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
                            <button
                                onClick={() => console.log("Forgot Password clicked")}
                                className="text-blue-600 dark:text-blue-400 hover:underline"
                            >
                                FORGOT PASSWORD?
                            </button>
                        </div>
                    </CardContent>
                </Card>
            </Card>
        </GuestLayout>
    );
}

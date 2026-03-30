'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import InputField from '@/components/forms/InputField';
import FooterLink from '@/components/forms/FooterLink';
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSession } from '@/lib/better-auth/client';
import { useEffect, useState } from 'react';

const SignIn = () => {
    const router = useRouter()
    const { data: session, isPending } = useSession();
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string>('');

    // Redirect to home if already logged in
    useEffect(() => {
        if (!isPending && session?.user) {
            router.push('/');
        }
    }, [session, isPending, router]);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<SignInFormData>({
        defaultValues: {
            email: '',
            password: '',
        },
        mode: 'onBlur',
    });

    const onSubmit = async (data: SignInFormData) => {
        try {
            setIsLoading(true);
            setErrorMessage('');

            // Sign in via HTTP call to better-auth endpoint
            const response = await fetch('/api/auth/sign-in/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // Important: include cookies
                body: JSON.stringify({
                    email: data.email,
                    password: data.password,
                })
            });

            const result = await response.json();

            if (!response.ok || !result.user) {
                const errorMsg = result.error?.message || result.message || 'Invalid email or password';
                setErrorMessage(errorMsg);

                // Show different message for wrong password vs user not found
                if (errorMsg.toLowerCase().includes('password') || errorMsg.toLowerCase().includes('invalid')) {
                    toast.error('Login Failed', {
                        description: '❌ Incorrect email or password. Please try again.'
                    });
                } else {
                    toast.error('Login Failed', {
                        description: errorMsg
                    });
                }
                throw new Error(errorMsg);
            }

            toast.success('Signed in successfully! 🎉');
            console.log('✅ Sign in successful, redirecting to home...');

            // Do a full page reload to ensure cookies are picked up
            setTimeout(() => {
                window.location.href = '/';
            }, 500);
        } catch (e) {
            console.error('❌ Sign in error:', e);
        } finally {
            setIsLoading(false);
        }
    }

    // Show loading state while checking authentication
    if (isPending) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <h1 className="form-title">Welcome back</h1>

            {errorMessage && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-red-600 dark:text-red-400 text-sm font-medium">
                        ❌ {errorMessage}
                    </p>
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <InputField
                    name="email"
                    label="Email"
                    placeholder="contact@jsmastery.com"
                    register={register}
                    error={errors.email}
                    validation={{ required: 'Email is required', pattern: /^\w+@\w+\.\w+$/ }}
                />

                <InputField
                    name="password"
                    label="Password"
                    placeholder="Enter your password"
                    type="password"
                    register={register}
                    error={errors.password}
                    validation={{ required: 'Password is required', minLength: 8 }}
                />

                <Button type="submit" disabled={isSubmitting || isLoading} className="yellow-btn w-full mt-5">
                    {isSubmitting || isLoading ? 'Signing In...' : 'Sign In'}
                </Button>

                <FooterLink text="Don't have an account?" linkText="Create an account" href="/sign-up" />
            </form>
        </>
    );
};
export default SignIn;
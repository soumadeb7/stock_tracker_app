'use client';

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import InputField from "@/components/forms/InputField";
import SelectField from "@/components/forms/SelectField";
import { INVESTMENT_GOALS, PREFERRED_INDUSTRIES, RISK_TOLERANCE_OPTIONS } from "@/lib/constants";
import { CountrySelectField } from "@/components/forms/CountrySelectField";
import FooterLink from "@/components/forms/FooterLink";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/better-auth/client";
import { toast } from "sonner";
import { useEffect, useState } from "react";

const SignUp = () => {
    const router = useRouter()
    const { data: session, isPending } = useSession();
    const [isLoading, setIsLoading] = useState(false);

    // Redirect to home if already logged in
    useEffect(() => {
        if (!isPending && session?.user) {
            router.push('/');
        }
    }, [session, isPending, router]);

    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isSubmitting },
    } = useForm<SignUpFormData>({
        defaultValues: {
            fullName: '',
            email: '',
            password: '',
            country: 'US',
            investmentGoals: 'Growth',
            riskTolerance: 'Medium',
            preferredIndustry: 'Technology'
        },
        mode: 'onBlur'
    },);

    const onSubmit = async (data: SignUpFormData) => {
        try {
            setIsLoading(true);

            // Sign up via HTTP call to better-auth endpoint
            const response = await fetch('/api/auth/sign-up/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // Important: include cookies
                body: JSON.stringify({
                    email: data.email,
                    password: data.password,
                    name: data.fullName,
                })
            });

            const result = await response.json();

            if (!response.ok || !result.user) {
                throw new Error(result.error?.message || result.message || 'Sign up failed');
            }

            console.log('✅ Sign up successful, saving profile...');

            // Save additional profile data
            try {
                const profileRes = await fetch('/api/auth/save-profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        country: data.country,
                        investmentGoals: data.investmentGoals,
                        riskTolerance: data.riskTolerance,
                        preferredIndustry: data.preferredIndustry
                    })
                });

                if (profileRes.ok) {
                    console.log('✅ Profile saved successfully');
                } else {
                    console.warn('⚠️ Failed to save profile, but user was created');
                }
            } catch (e) {
                console.error('⚠️ Failed to save profile:', e);
            }

            toast.success('Account created successfully!');
            console.log('🔄 Redirecting to home...');

            // Do a full page reload to ensure cookies are picked up
            setTimeout(() => {
                window.location.href = '/';
            }, 500);
        } catch (e) {
            console.error('❌ Sign up error:', e);
            const message = e instanceof Error ? e.message : 'Failed to create an account.';
            toast.error('Sign up failed', { description: message });
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
            <h1 className="form-title">Sign Up & Personalize</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <InputField
                    name="fullName"
                    label="Full Name"
                    placeholder="John Doe"
                    register={register}
                    error={errors.fullName}
                    validation={{ required: 'Full name is required', minLength: 2 }}
                />

                <InputField
                    name="email"
                    label="Email"
                    placeholder="contact@jsmastery.com"
                    register={register}
                    error={errors.email}
                    validation={{ required: 'Email name is required', pattern: /^\w+@\w+\.\w+$/, message: 'Email address is required' }}
                />

                <InputField
                    name="password"
                    label="Password"
                    placeholder="Enter a strong password"
                    type="password"
                    register={register}
                    error={errors.password}
                    validation={{ required: 'Password is required', minLength: 8 }}
                />

                <CountrySelectField
                    name="country"
                    label="Country"
                    control={control}
                    error={errors.country}
                    required
                />

                <SelectField
                    name="investmentGoals"
                    label="Investment Goals"
                    placeholder="Select your investment goal"
                    options={INVESTMENT_GOALS}
                    control={control}
                    error={errors.investmentGoals}
                    required
                />

                <SelectField
                    name="riskTolerance"
                    label="Risk Tolerance"
                    placeholder="Select your risk level"
                    options={RISK_TOLERANCE_OPTIONS}
                    control={control}
                    error={errors.riskTolerance}
                    required
                />

                <SelectField
                    name="preferredIndustry"
                    label="Preferred Industry"
                    placeholder="Select your preferred industry"
                    options={PREFERRED_INDUSTRIES}
                    control={control}
                    error={errors.preferredIndustry}
                    required
                />

                <Button type="submit" disabled={isSubmitting || isLoading} className="yellow-btn w-full mt-5">
                    {isSubmitting || isLoading ? 'Creating Account' : 'Start Your Investing Journey'}
                </Button>

                <FooterLink text="Already have an account?" linkText="Sign in" href="/sign-in" />
            </form>
        </>
    )
}
export default SignUp;
'use client';

import Link from "next/link";
import Image from "next/image";
import NavItems from "@/components/NavItems"
import { Button } from "@/components/ui/button";
import { useSession, authClient } from "@/lib/better-auth/client";
import { useRouter } from "next/navigation";
import { signOutAction } from "@/lib/actions/signout.actions";
import { useEffect } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { LogOut } from "lucide-react";

const Header = () => {
    const { data: session, isPending } = useSession();
    const router = useRouter();

    // Force validate session when component mounts
    useEffect(() => {
        const refreshSession = async () => {
            try {
                console.log('🔄 Checking session...');
                const session = await authClient.getSession();
                console.log('📊 Session state:', session);
            } catch (error) {
                console.error('❌ Failed to check session:', error);
            }
        };

        if (!isPending) {
            refreshSession();
        }
    }, [isPending]);

    const handleSignOut = async () => {
        try {
            console.log('🚪 Starting sign-out process...');

            // Clear cookies server-side
            await signOutAction();
            console.log('✅ Server-side sign-out completed');

            // Clear client-side session via better-auth
            await authClient.signOut({
                fetchOptions: {
                    onSuccess: () => {
                        console.log('✅ Client-side sign-out successful');
                    }
                }
            });
        } catch (error) {
            console.error('⚠️ Error during sign-out:', error);
        } finally {
            // Just refresh the page to update header with sign-in/sign-up options
            console.log('🔄 Refreshing page...');
            router.refresh();
        }
    }

    return (
        <header className='sticky top-0 header'>
            <div className="container header-wrapper">
                <Link href="/">
                    <Image src="/assets/images/logo.png" alt="Signalist logo" width={140} height={32} className="h-8 w-auto cursor-pointer" />
                </Link>
                <nav className="hidden sm:block">
                    <NavItems />
                </nav>
                <div className="flex items-center gap-2">
                    {!isPending && session?.user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="flex items-center gap-3 text-gray-400 hover:text-yellow-500 transition-colors">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback className="bg-yellow-500 text-yellow-900 text-sm font-bold">
                                            {session.user.name?.[0] || 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="hidden md:inline text-sm font-medium">
                                        {session.user.name}
                                    </span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>
                                    <div className="flex items-center gap-3 py-2">
                                        <Avatar className="h-9 w-9">
                                            <AvatarFallback className="bg-yellow-500 text-yellow-900 text-sm font-bold">
                                                {session.user.name?.[0] || 'U'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className='text-sm font-medium text-gray-100'>
                                                {session.user.name}
                                            </span>
                                            <span className="text-xs text-gray-500">{session.user.email}</span>
                                        </div>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-gray-700" />
                                <DropdownMenuItem asChild>
                                    <Link href="/inbox" className="cursor-pointer">
                                        📬 Inbox
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-gray-700" />
                                <DropdownMenuItem onClick={handleSignOut} className="text-gray-100 cursor-pointer focus:text-yellow-500">
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Sign Out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <>
                            <Link href="/sign-in" className="text-sm font-medium text-gray-300 hover:text-yellow-500 transition-colors">
                                Sign In
                            </Link>
                            <Link href="/sign-up">
                                <Button className="yellow-btn h-10 px-4 text-sm">Sign Up</Button>
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    )
}

export default Header

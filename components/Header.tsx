import Link from "next/link";
import Image from "next/image";
import NavItems from "@/components/NavItems"
import { Button } from "@/components/ui/button";

const Header = () => {
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
                    <Link href="/sign-in" className="text-sm font-medium text-gray-300 hover:text-yellow-500 transition-colors">
                        Sign In
                    </Link>
                    <Link href="/sign-up">
                        <Button className="yellow-btn h-10 px-4 text-sm">Sign Up</Button>
                    </Link>
                </div>
            </div>
        </header>
    )
}

export default Header

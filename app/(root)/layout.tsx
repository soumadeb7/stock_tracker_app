import Header from "@/components/Header"

type RootLayoutProps = {
    children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
    return (
        <main className="min-h-screen text-gray-400">
            <Header />
            <div className="container py-10">{children}</div>
        </main>
    );
}

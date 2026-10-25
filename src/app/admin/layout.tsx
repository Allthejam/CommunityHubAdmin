import AdminHeader from '@/components/layout/admin-header';
import Footer from '@/components/layout/footer';
import { PointerEventsFix } from '@/components/pointer-events-fix';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <PointerEventsFix />
      <AdminHeader />
      <main className="flex-1 bg-background p-4 sm:p-6 lg:p-8">{children}</main>
      <Footer />
    </div>
  );
}

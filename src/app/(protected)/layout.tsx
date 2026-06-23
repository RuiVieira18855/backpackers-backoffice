import { requireProfile } from "@/lib/dal";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { AppFooter } from "@/components/app-footer";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader
        fullName={profile.fullName}
        email={profile.email}
        avatarUrl={profile.avatarUrl}
        role={profile.role}
      />
      <div className="flex-1 flex min-h-0">
        <AppSidebar />
        <main className="flex-1 min-w-0 overflow-x-hidden flex flex-col">
          <div className="flex-1">{children}</div>
          <AppFooter />
        </main>
      </div>
    </div>
  );
}

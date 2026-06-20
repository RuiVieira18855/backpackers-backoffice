import { requireProfile } from "@/lib/dal";
import { AppHeader } from "@/components/app-header";

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
        role={profile.role}
      />
      <main className="flex-1">{children}</main>
    </div>
  );
}

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminLayoutClient } from "@/components/admin/admin-layout-client";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <AdminLayoutClient
      user={{
        name: session.user.name,
        email: session.user.email,
        plan: session.user.plan,
      }}
    >
      {children}
    </AdminLayoutClient>
  );
}

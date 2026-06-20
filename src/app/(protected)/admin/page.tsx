import { redirect } from "next/navigation";
import { requireRole } from "@/lib/dal";

export default async function AdminIndexPage() {
  await requireRole("admin_grupo");
  redirect("/admin/users");
}

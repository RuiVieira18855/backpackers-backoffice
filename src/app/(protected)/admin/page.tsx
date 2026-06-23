import { redirect } from "next/navigation";
import { requireSkill } from "@/lib/dal";

export default async function AdminIndexPage() {
  await requireSkill("admin");
  redirect("/admin/users");
}

import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { STYLISTS } from "@/lib/catalog";
import AdminCalendar from "./AdminCalendar";

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  return <AdminCalendar stylists={STYLISTS} />;
}

import { redirect } from "next/navigation";

export default async function DashboardFavoritesPage() {
  redirect("/favorites");
}

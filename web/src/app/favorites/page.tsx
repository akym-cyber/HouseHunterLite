import { requireSession } from "@/lib/auth/require-session";
import { FavoritesList } from "@/features/favorites/components/favorites-list";

export default async function FavoritesPage() {
  const session = await requireSession("/favorites");

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h1 className="text-xl font-semibold text-slate-900">Favorites</h1>
        <p className="mt-2 text-sm text-slate-600">
          Saved listings are loaded from `users/{'{userId}'}/favorites`.
        </p>
      </section>
      <FavoritesList userId={session.uid} />
    </div>
  );
}


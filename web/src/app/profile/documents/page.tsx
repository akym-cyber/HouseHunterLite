import { requireSession } from "@/lib/auth/require-session";
import { getDocumentsForUser } from "@/features/profile/services/profile-server-service";

export const dynamic = "force-dynamic";

function formatDate(value?: number): string {
  if (!value) return "Unknown";
  return new Date(value).toLocaleString();
}

export default async function ProfileDocumentsPage() {
  const session = await requireSession("/profile/documents");
  const items = await getDocumentsForUser(session.uid);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h1 className="text-xl font-semibold text-slate-900">Documents</h1>
        <p className="mt-2 text-sm text-slate-600">Your uploaded agreements and supporting files.</p>
      </section>

      {items.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          No documents uploaded yet.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{item.type ?? "Document"}</p>
                </div>
                <p className="text-xs text-slate-500">Uploaded: {formatDate(item.createdAt)}</p>
              </div>
              {item.url ? (
                <div className="mt-3">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-brand-700 underline underline-offset-2"
                  >
                    Open document
                  </a>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

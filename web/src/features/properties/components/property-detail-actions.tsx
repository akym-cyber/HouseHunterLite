"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { addFavorite, removeFavorite } from "@/features/favorites/services/favorites-service";
import { useFavorites } from "@/features/favorites/hooks/use-favorites";
import { useAuthStore } from "@/features/auth/store/use-auth-store";
import { trackPropertySave } from "@/features/properties/services/property-analytics-service";

type PropertyDetailActionsProps = {
  propertyId: string;
  ownerId: string;
  title: string;
  location: string;
  coverUrl?: string;
  imageUrls?: string[];
  price: number;
};

export function PropertyDetailActions({
  propertyId,
  ownerId,
  title,
  location,
  coverUrl,
  imageUrls,
  price
}: PropertyDetailActionsProps) {
  const router = useRouter();
  const authUser = useAuthStore((state) => state.user);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const effectiveUserId = authUser?.uid ?? null;
  const { favorites } = useFavorites(isHydrated && effectiveUserId ? effectiveUserId : null);

  const [isSaving, setIsSaving] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [showViewingForm, setShowViewingForm] = useState(false);
  const [applyMessage, setApplyMessage] = useState("");
  const [viewingDate, setViewingDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [viewingType, setViewingType] = useState("in_person");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState(authUser?.email ?? "");
  const [contactPhone, setContactPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isFavorite = useMemo(
    () => favorites.some((item) => item.propertyId === propertyId),
    [favorites, propertyId]
  );
  const isOwner = !!effectiveUserId && effectiveUserId === ownerId;
  const canUseTenantActions = !!effectiveUserId && !isOwner;

  const handleToggleFavorite = async () => {
    if (!effectiveUserId) {
      setError("Sign in to save properties.");
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSaving(true);
    try {
      if (isFavorite) {
        await removeFavorite(effectiveUserId, propertyId);
      } else {
        await addFavorite(effectiveUserId, {
          propertyId,
          title,
          location,
          coverUrl,
          imageUrls,
          price
        });
        await trackPropertySave(propertyId).catch(() => {
          // Favorites should still succeed if analytics tracking fails.
        });
      }
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Failed to update favorites.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canUseTenantActions) {
      setError("Only signed-in tenants can apply.");
      return;
    }

    setError(null);
    setSuccess(null);
    setIsApplying(true);
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          propertyId,
          message: applyMessage.trim()
        })
      });
      const payload = (await response.json()) as { error?: string; alreadyExists?: boolean };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to submit application");
      }

      setShowApplyForm(false);
      setApplyMessage("");
      setSuccess(payload.alreadyExists ? "Application already exists for this property." : "Application submitted.");
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : "Failed to submit application");
    } finally {
      setIsApplying(false);
    }
  };

  const handleScheduleViewing = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canUseTenantActions) {
      setError("Only signed-in tenants can schedule viewings.");
      return;
    }

    if (!viewingDate || !timeSlot || !contactName.trim() || !contactEmail.trim()) {
      setError("Please fill in all required viewing fields.");
      return;
    }

    setError(null);
    setSuccess(null);
    setIsScheduling(true);
    try {
      const response = await fetch("/api/viewings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          propertyId,
          scheduledAt: viewingDate,
          timeSlot: timeSlot.trim(),
          viewingType,
          contactName: contactName.trim(),
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim(),
          notes: notes.trim()
        })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to schedule viewing");
      }

      setShowViewingForm(false);
      setViewingDate("");
      setTimeSlot("");
      setViewingType("in_person");
      setContactName("");
      setContactPhone("");
      setNotes("");
      setSuccess("Viewing request sent.");
    } catch (scheduleError) {
      setError(scheduleError instanceof Error ? scheduleError.message : "Failed to schedule viewing");
    } finally {
      setIsScheduling(false);
    }
  };

  const handleDeleteListing = async () => {
    if (!isOwner || isDeleting) return;
    const confirmed = window.confirm("Delete this listing? This action cannot be undone.");
    if (!confirmed) return;

    setError(null);
    setSuccess(null);
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/properties/${encodeURIComponent(propertyId)}`, {
        method: "DELETE",
        credentials: "include"
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete listing");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete listing");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => void handleToggleFavorite()}
        disabled={isSaving}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSaving ? "Please wait..." : isFavorite ? "Remove from Favorites" : "Add to Favorites"}
      </button>

      <Link
        href={`/messages?userId=${encodeURIComponent(ownerId)}&propertyId=${encodeURIComponent(propertyId)}`}
        className="inline-flex w-full items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        Message Owner
      </Link>

      {canUseTenantActions ? (
        <>
          <button
            type="button"
            onClick={() => setShowApplyForm((prev) => !prev)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {showApplyForm ? "Cancel Application Form" : "Apply for Property"}
          </button>

          {showApplyForm ? (
            <form className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3" onSubmit={handleApply}>
              <label className="block text-xs font-medium text-slate-600" htmlFor="application-message">
                Optional message
              </label>
              <textarea
                id="application-message"
                value={applyMessage}
                onChange={(event) => setApplyMessage(event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                placeholder="Tell the owner a little about your interest."
              />
              <button
                type="submit"
                disabled={isApplying}
                className="w-full rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-70"
              >
                {isApplying ? "Submitting..." : "Submit Application"}
              </button>
            </form>
          ) : null}

          <button
            type="button"
            onClick={() => setShowViewingForm((prev) => !prev)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {showViewingForm ? "Cancel Viewing Form" : "Schedule Viewing"}
          </button>

          {showViewingForm ? (
            <form className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3" onSubmit={handleScheduleViewing}>
              <label className="block text-xs font-medium text-slate-600" htmlFor="viewing-date">
                Date and time
              </label>
              <input
                id="viewing-date"
                type="datetime-local"
                value={viewingDate}
                onChange={(event) => setViewingDate(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                required
              />

              <input
                type="text"
                value={timeSlot}
                onChange={(event) => setTimeSlot(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                placeholder="Time slot (e.g. 2:00 PM - 3:00 PM)"
                required
              />

              <select
                value={viewingType}
                onChange={(event) => setViewingType(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              >
                <option value="in_person">In person</option>
                <option value="virtual">Virtual</option>
                <option value="self_guided">Self guided</option>
              </select>

              <input
                type="text"
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                placeholder="Contact name"
                required
              />
              <input
                type="email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                placeholder="Contact email"
                required
              />
              <input
                type="text"
                value={contactPhone}
                onChange={(event) => setContactPhone(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                placeholder="Contact phone (optional)"
              />
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                placeholder="Notes (optional)"
              />
              <button
                type="submit"
                disabled={isScheduling}
                className="w-full rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-70"
              >
                {isScheduling ? "Submitting..." : "Request Viewing"}
              </button>
            </form>
          ) : null}
        </>
      ) : null}

      {isOwner ? (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Owner Controls</p>
          <Link
            href="/dashboard"
            className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Edit Listing in Dashboard
          </Link>
          <button
            type="button"
            onClick={() => void handleDeleteListing()}
            disabled={isDeleting}
            className="w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-70"
          >
            {isDeleting ? "Deleting..." : "Delete Listing"}
          </button>
        </div>
      ) : null}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {success ? <p className="text-xs text-emerald-700">{success}</p> : null}
      {!effectiveUserId ? (
        <p className="text-xs text-slate-500">Sign in to apply, schedule a viewing, and save this property.</p>
      ) : null}
    </div>
  );
}


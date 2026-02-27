async function postAnalytics(path: string): Promise<void> {
  const response = await fetch(path, {
    method: "POST",
    credentials: "include"
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? "Analytics request failed");
  }
}

export async function trackPropertyView(propertyId: string): Promise<void> {
  if (!propertyId) return;
  await postAnalytics(`/api/properties/${encodeURIComponent(propertyId)}/analytics/views`);
}

export async function trackPropertySave(propertyId: string): Promise<void> {
  if (!propertyId) return;
  await postAnalytics(`/api/properties/${encodeURIComponent(propertyId)}/analytics/saves`);
}

export async function trackPropertyMessageStart(propertyId: string): Promise<void> {
  if (!propertyId) return;
  await postAnalytics(`/api/properties/${encodeURIComponent(propertyId)}/analytics/messages-started`);
}

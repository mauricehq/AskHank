function isMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

export async function shareUrl(
  url: string,
  title?: string
): Promise<"shared" | "copied" | "cancelled" | "error"> {
  try {
    if (isMobile() && navigator.share) {
      await navigator.share({ url, title });
      return "shared";
    }

    await navigator.clipboard.writeText(url);
    return "copied";
  } catch (e: any) {
    // User cancelled share sheet
    if (e?.name === "AbortError") return "cancelled";

    // Fallback: try clipboard
    try {
      await navigator.clipboard.writeText(url);
      return "copied";
    } catch {
      return "error";
    }
  }
}

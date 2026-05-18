export async function readApiError(
  res: Response,
  fallback: string,
): Promise<string> {
  try {
    const json = (await res.json()) as { error?: string };
    if (typeof json.error === "string" && json.error) {
      return json.error;
    }
  } catch {
    // Response was not JSON
  }

  return `${fallback} (${res.status})`;
}

export async function fetchJSON(
  url: string,
  token?: string,
  options: RequestInit = {}
) {
  const res = await fetch(process.env.NEXT_PUBLIC_API_URL + url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Request failed");
  }

  return res.json();
}
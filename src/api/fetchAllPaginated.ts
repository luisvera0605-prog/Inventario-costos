/**
 * Fetches all records from a Dataverse OData endpoint, following @odata.nextLink
 * pagination until all records are retrieved.
 */
export async function fetchAllPaginated<T>(
  initialUrl: string,
  token: string
): Promise<T[]> {
  const results: T[] = [];
  let url: string | undefined = initialUrl;

  while (url) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
      },
    });

    if (!res.ok) {
      throw new Error(`Pagination fetch failed at ${url}: ${res.status} ${await res.text()}`);
    }

    const data: { value: T[]; '@odata.nextLink'?: string } = await res.json();
    results.push(...data.value);
    url = data['@odata.nextLink'];
  }

  return results;
}

const BASE_URL = `${import.meta.env.VITE_DATAVERSE_URL}/api/data/v9.2`;

function buildHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'OData-MaxVersion': '4.0',
    'OData-Version': '4.0',
    Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
  };
}

export interface ODataResponse<T> {
  value: T[];
  '@odata.nextLink'?: string;
  '@odata.count'?: number;
}

export async function dvGetRecords<T>(
  entity: string,
  token: string,
  params?: {
    select?: string[];
    filter?: string;
    expand?: string;
    orderby?: string;
    top?: number;
  }
): Promise<ODataResponse<T>> {
  const query = new URLSearchParams();
  if (params?.select?.length) query.set('$select', params.select.join(','));
  if (params?.filter) query.set('$filter', params.filter);
  if (params?.expand) query.set('$expand', params.expand);
  if (params?.orderby) query.set('$orderby', params.orderby);
  if (params?.top) query.set('$top', String(params.top));

  const qs = query.toString();
  const url = `${BASE_URL}/${entity}${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: buildHeaders(token) });
  if (!res.ok) throw new Error(`GET ${entity} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function dvGetById<T>(entity: string, id: string, token: string, expand?: string): Promise<T> {
  const url = `${BASE_URL}/${entity}(${id})${expand ? `?$expand=${expand}` : ''}`;
  const res = await fetch(url, { headers: buildHeaders(token) });
  if (!res.ok) throw new Error(`GET ${entity}/${id} failed: ${res.status}`);
  return res.json();
}

export async function dvCreate<T>(entity: string, data: Partial<T>, token: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/${entity}`, {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`POST ${entity} failed: ${res.status} ${await res.text()}`);
  const location = res.headers.get('OData-EntityId') || '';
  const match = location.match(/\(([^)]+)\)$/);
  return match ? match[1] : '';
}

export async function dvUpdate<T>(entity: string, id: string, data: Partial<T>, token: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${entity}(${id})`, {
    method: 'PATCH',
    headers: buildHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`PATCH ${entity}/${id} failed: ${res.status} ${await res.text()}`);
}

export async function dvDelete(entity: string, id: string, token: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${entity}(${id})`, {
    method: 'DELETE',
    headers: buildHeaders(token),
  });
  if (!res.ok) throw new Error(`DELETE ${entity}/${id} failed: ${res.status}`);
}

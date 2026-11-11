# 05: REST API & Next.js Integration Architecture
## Consuming Business Central Custom API Pages from Modern Web Frontends

---

### 1. Business Central REST / OData V4 URL Conventions

Custom API Pages scaffolded by ALchemy 365 are routed using standard Microsoft Dynamics 365 Business Central URL paths:

```
https://api.businesscentral.dynamics.com/v2.0/{tenantId}/{environment}/api/{APIPublisher}/{APIGroup}/{APIVersion}/companies({companyId})/{EntitySetName}
```

**Example for our Loyalty Extension**:
```
https://api.businesscentral.dynamics.com/v2.0/72f988bf-86f1-41af-91ab-2d7cd011db47/Production/api/alc/loyalty/v2.0/companies(1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d)/customerLoyalties
```

---

### 2. Microsoft Entra ID (Azure AD) OAuth2 Token Management

#### Security Guardrails
- **NEVER** expose the Azure Client Secret to the browser.
- All token acquisition and BC REST API calls must be proxied through server-side routes (Next.js Route Handlers or Express API endpoints).

#### Client Credentials Flow with In-Memory Caching

```typescript
interface TokenCache {
  token: string;
  expiresAt: number;
}

let cachedToken: TokenCache | null = null;

export async function getBCAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60000) {
    return cachedToken.token;
  }

  const tenantId = process.env.AZURE_TENANT_ID!;
  const clientId = process.env.AZURE_CLIENT_ID!;
  const clientSecret = process.env.AZURE_CLIENT_SECRET!;

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://api.businesscentral.dynamics.com/.default',
  });

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(`Entra ID authentication failed (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };

  return cachedToken.token;
}
```

---

### 3. Next.js 14/15 App Router Route Handler (`app/api/bc/[entity]/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getBCAccessToken } from '@/lib/bcAuth';

export async function GET(request: NextRequest, { params }: { params: { entity: string } }) {
  try {
    const token = await getBCAccessToken();
    const searchParams = request.nextUrl.searchParams;
    const filter = searchParams.get('$filter');
    const top = searchParams.get('$top') || '50';

    const tenantId = process.env.AZURE_TENANT_ID!;
    const env = process.env.BC_ENVIRONMENT || 'production';
    const companyId = process.env.BC_COMPANY_ID!;

    let targetUrl = `https://api.businesscentral.dynamics.com/v2.0/${tenantId}/${env}/api/alc/loyalty/v2.0/companies(${companyId})/${params.entity}?$top=${top}`;
    if (filter) {
      targetUrl += `&$filter=${encodeURIComponent(filter)}`;
    }

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { entity: string } }) {
  try {
    const token = await getBCAccessToken();
    const body = await request.json();

    const tenantId = process.env.AZURE_TENANT_ID!;
    const env = process.env.BC_ENVIRONMENT || 'production';
    const companyId = process.env.BC_COMPANY_ID!;

    const targetUrl = `https://api.businesscentral.dynamics.com/v2.0/${tenantId}/${env}/api/alc/loyalty/v2.0/companies(${companyId})/${params.entity}`;

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

---

### 4. React Client Custom Hook (`hooks/useBusinessCentralEntity.ts`)

```typescript
import { useState, useEffect, useCallback } from 'react';

export function useBusinessCentralEntity<T>(entitySet: string, filterQuery?: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = filterQuery
        ? `/api/bc/${entitySet}?$filter=${encodeURIComponent(filterQuery)}`
        : `/api/bc/${entitySet}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      setData(json.value || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [entitySet, filterQuery]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const createRecord = async (payload: Partial<T>): Promise<T> => {
    const res = await fetch(`/api/bc/${entitySet}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Creation failed: ${res.statusText}`);
    const newRecord = await res.json();
    setData((prev) => [newRecord, ...prev]);
    return newRecord;
  };

  return { data, loading, error, refetch: fetchRecords, createRecord };
}
```

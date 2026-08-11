import dotenv from "dotenv";

dotenv.config();

const baseUrl = "http://localhost:5000";

async function requestJson(path: string, options: RequestInit = {}): Promise<{ status: number; json: unknown }> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    }
  });

  const json = await response.json();
  return { status: response.status, json };
}

async function run(): Promise<void> {
  const loginResult = await requestJson("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: "sales@example.com",
      password: "password123"
    })
  });

  if (loginResult.status !== 200) {
    throw new Error(`Login failed: ${JSON.stringify(loginResult.json)}`);
  }

  const loginData = loginResult.json as { data: { token: string } };
  const token = loginData.data.token;
  const authHeaders = {
    Authorization: `Bearer ${token}`
  };
  const stamp = Date.now();
  const customerEmail = `smoke-${stamp}@example.com`;
  const customerName = `Smoke Customer ${stamp}`;

  const createResult = await requestJson("/api/customers", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      name: customerName,
      mobile: `99999${String(stamp).slice(-5)}`,
      email: customerEmail,
      businessName: `Smoke Business ${stamp}`,
      gstNumber: `GST${String(stamp).slice(-8)}`,
      customerType: "Wholesale",
      address: "123 Smoke Street, Bengaluru",
      status: "Active",
      followUpDate: "2026-08-12",
      notes: "Created from smoke test"
    })
  });

  if (createResult.status !== 201) {
    throw new Error(`Create customer failed: ${JSON.stringify(createResult.json)}`);
  }

  const createdCustomer = createResult.json as { data: { id: number } };
  const customerId = createdCustomer.data.id;

  const listResult = await requestJson("/api/customers?search=Smoke&page=1&limit=10", {
    method: "GET",
    headers: authHeaders
  });

  if (listResult.status !== 200) {
    throw new Error(`List customers failed: ${JSON.stringify(listResult.json)}`);
  }

  const detailResult = await requestJson(`/api/customers/${customerId}`, {
    method: "GET",
    headers: authHeaders
  });

  if (detailResult.status !== 200) {
    throw new Error(`Get customer failed: ${JSON.stringify(detailResult.json)}`);
  }

  const updateResult = await requestJson(`/api/customers/${customerId}`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({
      notes: "Updated from smoke test",
      address: "456 Updated Avenue, Bengaluru"
    })
  });

  if (updateResult.status !== 200) {
    throw new Error(`Update customer failed: ${JSON.stringify(updateResult.json)}`);
  }

  const followupResult = await requestJson(`/api/customers/${customerId}/followups`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      note: "Smoke follow-up note",
      followUpDate: "2026-08-13"
    })
  });

  if (followupResult.status !== 201) {
    throw new Error(`Create followup failed: ${JSON.stringify(followupResult.json)}`);
  }

  const followupListResult = await requestJson(`/api/customers/${customerId}/followups`, {
    method: "GET",
    headers: authHeaders
  });

  if (followupListResult.status !== 200) {
    throw new Error(`List followups failed: ${JSON.stringify(followupListResult.json)}`);
  }

  console.log(JSON.stringify({
    loginStatus: loginResult.status,
    createStatus: createResult.status,
    listStatus: listResult.status,
    detailStatus: detailResult.status,
    updateStatus: updateResult.status,
    followupCreateStatus: followupResult.status,
    followupListStatus: followupListResult.status,
    customerId
  }, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

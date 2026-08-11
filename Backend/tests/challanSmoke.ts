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
  // Login as sales user
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
  const authHeaders = { Authorization: `Bearer ${token}` };
  const stamp = Date.now();

  // Login as warehouse to create a product
  const whLoginResult = await requestJson("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: "warehouse@example.com",
      password: "password123"
    })
  });
  const whToken = (whLoginResult.json as { data: { token: string } }).data.token;
  const whHeaders = { Authorization: `Bearer ${whToken}` };

  // Create product (as warehouse)
  const productResult = await requestJson("/api/products", {
    method: "POST",
    headers: whHeaders,
    body: JSON.stringify({
      name: `Challan Test Product ${stamp}`,
      sku: `CTP-${stamp}`,
      category: "Challan Test",
      unitPrice: 500.00,
      currentStock: 50,
      minimumStock: 5,
      warehouseLocation: "Rack B-2"
    })
  });

  if (productResult.status !== 201) {
    throw new Error(`Create product failed: ${JSON.stringify(productResult.json)}`);
  }

  const productId = (productResult.json as { data: { id: number } }).data.id;

  // Create a customer (as sales)
  const customerResult = await requestJson("/api/customers", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      name: `Challan Test Customer ${stamp}`,
      mobile: `88888${String(stamp).slice(-5)}`,
      businessName: `Challan Test Business ${stamp}`,
      customerType: "Wholesale",
      address: "789 Challan Street, Mumbai"
    })
  });

  if (customerResult.status !== 201) {
    throw new Error(`Create customer failed: ${JSON.stringify(customerResult.json)}`);
  }

  const customerId = (customerResult.json as { data: { id: number } }).data.id;

  // ④ CREATE SALES CHALLAN (DRAFT)
  const challanResult = await requestJson("/api/challans", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      customerId,
      items: [
        { productId, quantity: 10 }
      ]
    })
  });

  if (challanResult.status !== 201) {
    throw new Error(`Create challan failed: ${JSON.stringify(challanResult.json)}`);
  }

  const challanData = challanResult.json as { data: { id: number; challanNumber: string; status: string } };
  const challanId = challanData.data.id;

  // List challans
  const listResult = await requestJson("/api/challans?page=1&limit=10", {
    method: "GET",
    headers: authHeaders
  });

  if (listResult.status !== 200) {
    throw new Error(`List challans failed: ${JSON.stringify(listResult.json)}`);
  }

  // Get challan detail
  const detailResult = await requestJson(`/api/challans/${challanId}`, {
    method: "GET",
    headers: authHeaders
  });

  if (detailResult.status !== 200) {
    throw new Error(`Get challan failed: ${JSON.stringify(detailResult.json)}`);
  }

  // Update DRAFT challan (change quantity)
  const updateResult = await requestJson(`/api/challans/${challanId}`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({
      items: [
        { productId, quantity: 5 }
      ]
    })
  });

  if (updateResult.status !== 200) {
    throw new Error(`Update challan failed: ${JSON.stringify(updateResult.json)}`);
  }

  // ⑤⑥⑦⑧ CONFIRM SALE — the critical transaction
  const confirmResult = await requestJson(`/api/challans/${challanId}/confirm`, {
    method: "POST",
    headers: authHeaders
  });

  if (confirmResult.status !== 200) {
    throw new Error(`Confirm challan failed: ${JSON.stringify(confirmResult.json)}`);
  }

  const confirmedData = confirmResult.json as { data: { status: string } };

  // Verify stock was reduced — get product again
  const productAfter = await requestJson(`/api/products/${productId}`, {
    method: "GET",
    headers: whHeaders
  });

  const afterStock = (productAfter.json as { data: { currentStock: number } }).data.currentStock;

  // Verify stock movements were recorded
  const movements = await requestJson(`/api/products/${productId}/movements?page=1&limit=10`, {
    method: "GET",
    headers: whHeaders
  });

  // Test: cannot confirm again
  const doubleConfirmResult = await requestJson(`/api/challans/${challanId}/confirm`, {
    method: "POST",
    headers: authHeaders
  });

  // Test: create another challan and cancel it
  const challan2Result = await requestJson("/api/challans", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      customerId,
      items: [{ productId, quantity: 2 }]
    })
  });

  const challan2Id = (challan2Result.json as { data: { id: number } }).data.id;

  // Login as admin to cancel
  const adminLoginResult = await requestJson("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "admin@example.com", password: "password123" })
  });
  const adminToken = (adminLoginResult.json as { data: { token: string } }).data.token;
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  const cancelResult = await requestJson(`/api/challans/${challan2Id}/cancel`, {
    method: "POST",
    headers: adminHeaders
  });

  if (cancelResult.status !== 200) {
    throw new Error(`Cancel challan failed: ${JSON.stringify(cancelResult.json)}`);
  }

  console.log(JSON.stringify({
    challanCreateStatus: challanResult.status,
    challanNumber: challanData.data.challanNumber,
    challanDraftStatus: challanData.data.status,
    listStatus: listResult.status,
    detailStatus: detailResult.status,
    updateStatus: updateResult.status,
    confirmStatus: confirmResult.status,
    confirmedStatus: confirmedData.data.status,
    stockBefore: 50,
    stockAfter: afterStock,
    stockReduced: afterStock === 45,
    movementsStatus: movements.status,
    doubleConfirmBlocked: doubleConfirmResult.status === 409,
    cancelStatus: cancelResult.status
  }, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

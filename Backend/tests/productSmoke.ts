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
  // Login as admin (warehouse operations need ADMIN or WAREHOUSE role)
  const loginResult = await requestJson("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: "warehouse@example.com",
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

  // Create product
  const createResult = await requestJson("/api/products", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      name: `Smoke Product ${stamp}`,
      sku: `SKU-${stamp}`,
      category: "Test Category",
      unitPrice: 199.99,
      currentStock: 100,
      minimumStock: 10,
      warehouseLocation: "Rack A-1"
    })
  });

  if (createResult.status !== 201) {
    throw new Error(`Create product failed: ${JSON.stringify(createResult.json)}`);
  }

  const createdProduct = createResult.json as { data: { id: number } };
  const productId = createdProduct.data.id;

  // List products
  const listResult = await requestJson("/api/products?search=Smoke&page=1&limit=10", {
    method: "GET",
    headers: authHeaders
  });

  if (listResult.status !== 200) {
    throw new Error(`List products failed: ${JSON.stringify(listResult.json)}`);
  }

  // Get product detail
  const detailResult = await requestJson(`/api/products/${productId}`, {
    method: "GET",
    headers: authHeaders
  });

  if (detailResult.status !== 200) {
    throw new Error(`Get product failed: ${JSON.stringify(detailResult.json)}`);
  }

  // Update product
  const updateResult = await requestJson(`/api/products/${productId}`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({
      minimumStock: 20
    })
  });

  if (updateResult.status !== 200) {
    throw new Error(`Update product failed: ${JSON.stringify(updateResult.json)}`);
  }

  // Manual stock movement IN
  const movementInResult = await requestJson("/api/products/stock-movements", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      productId,
      quantity: 50,
      movementType: "IN",
      reason: "Smoke test stock received"
    })
  });

  if (movementInResult.status !== 201) {
    throw new Error(`Stock movement IN failed: ${JSON.stringify(movementInResult.json)}`);
  }

  // Manual stock movement OUT
  const movementOutResult = await requestJson("/api/products/stock-movements", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      productId,
      quantity: 5,
      movementType: "OUT",
      reason: "Smoke test stock adjustment"
    })
  });

  if (movementOutResult.status !== 201) {
    throw new Error(`Stock movement OUT failed: ${JSON.stringify(movementOutResult.json)}`);
  }

  // List product movements
  const movementsResult = await requestJson(`/api/products/${productId}/movements?page=1&limit=10`, {
    method: "GET",
    headers: authHeaders
  });

  if (movementsResult.status !== 200) {
    throw new Error(`List movements failed: ${JSON.stringify(movementsResult.json)}`);
  }

  // Low stock filter
  const lowStockResult = await requestJson("/api/products?lowStock=true&page=1&limit=10", {
    method: "GET",
    headers: authHeaders
  });

  if (lowStockResult.status !== 200) {
    throw new Error(`Low stock filter failed: ${JSON.stringify(lowStockResult.json)}`);
  }

  console.log(JSON.stringify({
    createStatus: createResult.status,
    listStatus: listResult.status,
    detailStatus: detailResult.status,
    updateStatus: updateResult.status,
    movementInStatus: movementInResult.status,
    movementOutStatus: movementOutResult.status,
    movementsListStatus: movementsResult.status,
    lowStockStatus: lowStockResult.status,
    productId
  }, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

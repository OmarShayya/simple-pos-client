# Gaming Session & Sales API Changes - Frontend Guide

## Overview

The gaming session flow has been completely refactored. Gaming sessions now create or attach to sales immediately when started, allowing customers to order items during their gaming session and pay everything together.

---

## Table of Contents

1. [Key Concept Changes](#key-concept-changes)
2. [API Changes](#api-changes)
3. [New Response Fields](#new-response-fields)
4. [Frontend Flow Updates](#frontend-flow-updates)
5. [Migration Guide](#migration-guide)

---

## Key Concept Changes

### Before:

```
Start Session → End Session → Process Payment (creates sale)
```

### After:

```
Start Session → Creates/Attaches to Sale (with $0 placeholder)
↓
Customer can order items (added to same sale)
↓
End Session → Updates sale with actual cost
↓
Pay Sale → Everything paid together (auto-ends active sessions)
```

### Important New Behavior:

- **Gaming sessions are now sale items** from the start
- **Active sessions auto-end when paying** to calculate final cost
- **Sales show real-time costs** for active sessions
- **Session items preserved** when updating sale with products

---

## API Changes

### 1. Start Gaming Session

**Endpoint:** `POST /api/v1/gaming-sessions`

#### New Request Body:

```json
{
  "pcId": "64f5a...",
  "customerId": "64f5a...", // optional
  "customerName": "John Doe", // optional
  "saleId": "64f5a...", // NEW: attach to existing sale
  "notes": "VIP customer" // optional
}
```

#### New Response:

```json
{
  "success": true,
  "data": {
    "id": "64f5a...",
    "sessionNumber": "20231126-0001",
    "pc": {
      "id": "64f5a...",
      "pcNumber": "PC-01",
      "name": "Gaming PC 1"
    },
    "customer": { ... },
    "customerName": "John Doe",
    "startTime": "2023-11-26T10:00:00.000Z",
    "hourlyRate": {
      "usd": 5,
      "lbp": 450000
    },
    "status": "active",
    "sale": {  // NEW: immediate sale reference
      "id": "64f5a...",
      "invoiceNumber": "20231126-0001"
    },
    "startedBy": {
      "name": "Admin User"
    }
  },
  "message": "Gaming session started successfully"
}
```

**Key Changes:**

- ✅ Added `saleId` parameter to attach session to existing sale
- ✅ Response now includes `sale` object with invoice number
- ✅ Sale is created immediately (not on payment)

---

### 2. End Gaming Session

**Endpoint:** `PUT /api/v1/gaming-sessions/:id/end`

#### New Request Body:

```json
{
  "discountId": "64f5a..." // NEW: optional discount
}
```

#### New Response:

```json
{
  "success": true,
  "data": {
    "id": "64f5a...",
    "sessionNumber": "20231126-0001",
    "pc": { ... },
    "customer": { ... },
    "customerName": "John Doe",
    "startTime": "2023-11-26T10:00:00.000Z",
    "endTime": "2023-11-26T13:00:00.000Z",
    "duration": 180,  // minutes
    "totalCost": {
      "usd": 15,
      "lbp": 1350000
    },
    "discount": {  // NEW: if discount applied
      "discountId": "64f5a...",
      "discountName": "VIP Discount",
      "percentage": 10,
      "amount": {
        "usd": 1.5,
        "lbp": 135000
      }
    },
    "finalAmount": {  // NEW: after discount
      "usd": 13.5,
      "lbp": 1215000
    },
    "status": "completed",
    "paymentStatus": "unpaid",
    "sale": {  // NEW: updated sale info
      "id": "64f5a...",
      "invoiceNumber": "20231126-0001",
      "totals": {  // Total including session + any items
        "usd": 13.5,
        "lbp": 1215000
      }
    }
  },
  "message": "Gaming session ended successfully"
}
```

**Key Changes:**

- ✅ Can now apply discounts when ending session
- ✅ Returns `discount` and `finalAmount` fields
- ✅ Sale totals automatically updated
- ✅ Response includes updated sale totals

---

### 3. Get Sale by ID

**Endpoint:** `GET /api/v1/sales/:id`

#### New Response Fields:

````json
{
  "success": true,
  "data": {
    "id": "64f5a...",
    "invoiceNumber": "20231126-0001",
    "customer": { ... },
    "items": [
      {
        "productId": "64f5a...",
        "productName": "Gaming - Gaming PC 1",  // Session item
        "productSku": "SESSION-20231126-0001",
        "quantity": 1,
        "unitPrice": {
          "usd": 15,
          "lbp": 1350000
        },
        "subtotal": {
          "usd": 15,
          "lbp": 1350000
        },
        "finalAmount": {
          "usd": 15,
          "lbp": 1350000
        }
      },
      {
        "productId": "64f5a...",
        "productName": "Coca Cola",  // Regular item
        "productSku": "PROD-001",
        "quantity": 2,
        "unitPrice": { ... },
        "subtotal": { ... },
        "finalAmount": { ... }
      }
    ],
    "totals": {  // Current saved totals
      "usd": 17,
      "lbp": 1530000
    },
    "currentTotals": {  // NEW: Real-time totals (if session active)
      "usd": 22.5,  // Includes current session cost
      "lbp": 2025000
    },
    "hasActiveSessions": true,  // NEW
    "activeSessions": [  // NEW: Active session details
      {
        "sessionNumber": "20231126-0001",
        "currentDuration": 210,  // current minutes
        "currentCost": {
          "usd": 17.5,
          "lbp": 1575000
        }
      }
    ],
    "status": "pending",
    "createdAt": "2023-11-26T10:00:00.000Z"
  },
  "message": "Sale retrieved successfully"
}

**Note on Session Items:**
Session items include additional metadata for real-time cost calculation:

```json
{
  "productId": "64f5a...",
  "productName": "Gaming - Gaming PC 1",
  "productSku": "SESSION-20231126-0001",
  "quantity": 1,
  "unitPrice": {
    "usd": 15,
    "lbp": 1350000
  },
  "subtotal": {
    "usd": 15,
    "lbp": 1350000
  },
  "finalAmount": {
    "usd": 15,
    "lbp": 1350000
  },
  "sessionData": {  // NEW: Only for session items
    "sessionId": "64f5a...",
    "sessionNumber": "20231126-0001",
    "hourlyRate": {  // Use this for real-time calculation
      "usd": 5,
      "lbp": 450000
    },
    "startTime": "2023-11-26T10:00:00.000Z",  // Calculate duration from this
    "status": "active"
  },
  "isActive": true  // NEW: Convenience flag for active sessions
}
````

**Frontend Real-Time Cost Calculation:**
Instead of polling the server, use the `sessionData.hourlyRate` and `sessionData.startTime` to calculate costs client-side:

```javascript
function calculateCurrentSessionCost(sessionItem) {
  if (!sessionItem.isActive) {
    return sessionItem.finalAmount;
  }

  const now = new Date();
  const startTime = new Date(sessionItem.sessionData.startTime);
  const durationMs = now - startTime;
  const durationHours = durationMs / (1000 * 60 * 60);

  return {
    usd:
      Math.round(sessionItem.sessionData.hourlyRate.usd * durationHours * 100) /
      100,
    lbp: Math.round(sessionItem.sessionData.hourlyRate.lbp * durationHours),
  };
}
```

````

**Key Changes:**
- ✅ `currentTotals` - Real-time cost including active sessions
- ✅ `hasActiveSessions` - Boolean flag
- ✅ `activeSessions` - Array with current duration and cost
- ✅ Session items identified by SKU starting with `SESSION-`

---

### 4. Pay Sale
**Endpoint:** `POST /api/v1/sales/:id/pay`

**Behavior Changes:**
- ✅ **Auto-ends active sessions** before processing payment
- ✅ Calculates final cost automatically
- ✅ Updates sale totals with actual session costs
- ✅ Marks all gaming sessions as paid

#### Request (unchanged):
```json
{
  "paymentMethod": "cash",
  "paymentCurrency": "USD",
  "amount": 22.5
}
````

#### Response (unchanged):

```json
{
  "success": true,
  "data": {
    "id": "64f5a...",
    "invoiceNumber": "20231126-0001",
    "status": "paid",
    "paymentMethod": "cash",
    "paymentCurrency": "USD",
    "amountPaid": {
      "usd": 22.5,
      "lbp": 2025000
    },
    "paidAt": "2023-11-26T13:30:00.000Z"
  },
  "message": "Payment processed successfully"
}
```

---

### 5. Update Sale

**Endpoint:** `PUT /api/v1/sales/:id`

**Behavior Changes:**

- ✅ **Preserves gaming session items** when updating
- ✅ Only updates product items
- ✅ Recalculates totals including sessions

#### Request:

```json
{
  "items": [
    // Only product items
    {
      "productId": "64f5a...",
      "quantity": 3
    }
  ],
  "notes": "Customer added more items"
}
```

**Important:** Do NOT include session items in the update. They are preserved automatically.

---

### 6. Cancel Sale

**Endpoint:** `DELETE /api/v1/sales/:id`

**Behavior Changes:**

- ✅ **Auto-cancels active gaming sessions**
- ✅ Marks PCs as available
- ✅ Only restores stock for product items (not sessions)

---

### 7. Process Session Payment (Deprecated but still works)

**Endpoint:** `POST /api/v1/gaming-sessions/:id/payment`

**Note:** This endpoint now redirects to sale payment. Prefer using the sale payment endpoint instead.

---

## New Response Fields

### All Gaming Session Responses:

- `sale` - Sale reference with invoice number
- `discount` - Applied discount (if any)
- `finalAmount` - Amount after discount

### Sale Responses:

- `currentTotals` - Real-time cost (accounts for active sessions)
- `hasActiveSessions` - Boolean indicating active sessions
- `activeSessions` - Array of active session details with current cost

### Sale Items (for session items):

- `sessionData` - Metadata for real-time cost calculation
  - `sessionId` - Session ID reference
  - `sessionNumber` - Session number
  - `hourlyRate` - { usd, lbp } - Use this to calculate live costs
  - `startTime` - Session start timestamp - Calculate duration from this
  - `status` - Current session status (active, completed, cancelled)
- `isActive` - Boolean convenience flag (true if session is active)

---

## Frontend Flow Updates

### Flow 1: Customer Starts Gaming

```typescript
// 1. Start session (creates sale automatically)
const sessionResponse = await POST("/gaming-sessions", {
  pcId: selectedPC.id,
  customerName: "John Doe",
});

const { sale, sessionNumber } = sessionResponse.data;
console.log("Sale created:", sale.invoiceNumber);

// 2. Customer decides to order snacks
await POST(`/sales/${sale.id}/items`, {
  items: [{ productId: colaId, quantity: 2 }],
});

// 3. End session when done playing
const endResponse = await PUT(`/gaming-sessions/${sessionId}/end`, {
  discountId: vipDiscountId, // optional
});

console.log("Total to pay:", endResponse.data.sale.totals);

// 4. Process payment
await POST(`/sales/${sale.id}/pay`, {
  paymentMethod: "cash",
  paymentCurrency: "USD",
  amount: endResponse.data.sale.totals.usd,
});
```

### Flow 2: Customer Orders First, Then Plays

```typescript
// 1. Create sale with items
const saleResponse = await POST("/sales", {
  items: [{ productId: colaId, quantity: 2 }],
});

const saleId = saleResponse.data.id;

// 2. Customer wants to play - attach session to existing sale
const sessionResponse = await POST("/gaming-sessions", {
  pcId: selectedPC.id,
  saleId: saleId, // Attach to existing sale
  customerName: "John Doe",
});

// 3. End session when done
await PUT(`/gaming-sessions/${sessionResponse.data.id}/end`);

// 4. Pay everything together
const saleData = await GET(`/sales/${saleId}`);
await POST(`/sales/${saleId}/pay`, {
  paymentMethod: "cash",
  paymentCurrency: "USD",
  amount: saleData.currentTotals.usd, // Use currentTotals!
});
```

### Flow 3: Display Current Cost (Real-time with Client-Side Calculation)

```typescript
// Get sale data (fetch once)
const saleData = await GET(`/sales/${saleId}`);

// Calculate live costs client-side
function calculateLiveSaleCost(sale) {
  let totalUsd = 0;
  let totalLbp = 0;

  sale.items.forEach((item) => {
    if (item.isActive && item.sessionData) {
      // Calculate current session cost
      const now = new Date();
      const startTime = new Date(item.sessionData.startTime);
      const durationMs = now - startTime;
      const durationHours = durationMs / (1000 * 60 * 60);

      const currentCostUsd =
        Math.round(item.sessionData.hourlyRate.usd * durationHours * 100) / 100;
      const currentCostLbp = Math.round(
        item.sessionData.hourlyRate.lbp * durationHours
      );

      totalUsd += currentCostUsd;
      totalLbp += currentCostLbp;
    } else {
      // Use saved cost for completed items
      totalUsd += item.finalAmount.usd;
      totalLbp += item.finalAmount.lbp;
    }
  });

  return { usd: totalUsd, lbp: totalLbp };
}

// Update UI every second without server calls
setInterval(() => {
  const liveCost = calculateLiveSaleCost(saleData);
  displayTotal(liveCost.usd);

  // Display individual session timers
  saleData.items.forEach((item) => {
    if (item.isActive && item.sessionData) {
      const now = new Date();
      const startTime = new Date(item.sessionData.startTime);
      const durationMinutes = Math.ceil((now - startTime) / (1000 * 60));
      const currentCost = calculateCurrentSessionCost(item);

      updateSessionDisplay(item.sessionData.sessionNumber, {
        duration: durationMinutes,
        cost: currentCost,
      });
    }
  });
}, 1000); // Update every second

function calculateCurrentSessionCost(sessionItem) {
  const now = new Date();
  const startTime = new Date(sessionItem.sessionData.startTime);
  const durationMs = now - startTime;
  const durationHours = durationMs / (1000 * 60 * 60);

  return {
    usd:
      Math.round(sessionItem.sessionData.hourlyRate.usd * durationHours * 100) /
      100,
    lbp: Math.round(sessionItem.sessionData.hourlyRate.lbp * durationHours),
  };
}
```

### Flow 3b: Display Current Cost (Server-Side Calculation - Alternative)

```typescript
// Alternative: Poll server for real-time costs (less efficient)
const saleData = await GET(`/sales/${saleId}`);

if (saleData.hasActiveSessions) {
  console.log("Saved total:", saleData.totals);
  console.log("Current total:", saleData.currentTotals);

  // Show active session info
  saleData.activeSessions.forEach((session) => {
    console.log(`Session ${session.sessionNumber}:`);
    console.log(`  Duration: ${session.currentDuration} minutes`);
    console.log(`  Current cost: $${session.currentCost.usd}`);
  });

  // Use currentTotals for display
  displayTotal(saleData.currentTotals.usd);
} else {
  // No active sessions, use regular totals
  displayTotal(saleData.totals.usd);
}
```

### Flow 4: Auto-End on Payment

```typescript
// Customer still playing but wants to pay
const saleData = await GET(`/sales/${saleId}`);

// Just pay - system auto-ends active sessions
await POST(`/sales/${saleId}/pay`, {
  paymentMethod: "cash",
  paymentCurrency: "USD",
  amount: saleData.currentTotals.usd, // Use currentTotals
});

// Session is automatically ended and PC is freed
```

---

## Migration Guide

### 1. Update Sale Display Component

```typescript
// Before
function SaleDisplay({ saleId }) {
  const sale = useSale(saleId);
  return <div>Total: ${sale.totals.usd}</div>;
}

// After
function SaleDisplay({ saleId }) {
  const sale = useSale(saleId);
  const displayTotal = sale.hasActiveSessions
    ? sale.currentTotals
    : sale.totals;

  return (
    <div>
      <div>Total: ${displayTotal.usd}</div>
      {sale.hasActiveSessions && (
        <div className="warning">⏱️ Active sessions - cost is updating</div>
      )}
    </div>
  );
}
```

### 2. Update Payment Flow

```typescript
// Before
async function paySale(saleId, amount) {
  await POST(`/sales/${saleId}/pay`, {
    amount,
    paymentMethod: "cash",
    paymentCurrency: "USD",
  });
}

// After
async function paySale(saleId) {
  // Get current cost first
  const sale = await GET(`/sales/${saleId}`);
  const amount = sale.hasActiveSessions
    ? sale.currentTotals.usd
    : sale.totals.usd;

  await POST(`/sales/${saleId}/pay`, {
    amount,
    paymentMethod: "cash",
    paymentCurrency: "USD",
  });
  // Sessions auto-ended, PCs freed
}
```

### 3. Handle Session Items in Sale List

```typescript
// Identify session items
function isSessionItem(item) {
  return item.productSku.startsWith("SESSION-");
}

// Display items differently
function SaleItemsList({ items }) {
  return (
    <div>
      {items.map((item) => (
        <div key={item.productSku}>
          {isSessionItem(item) ? (
            <SessionItem item={item} /> // Special display
          ) : (
            <ProductItem item={item} /> // Regular display
          )}
        </div>
      ))}
    </div>
  );
}
```

### 4. Update Sale Update Logic

```typescript
// Before - Would lose session items
async function updateSaleItems(saleId, newItems) {
  await PUT(`/sales/${saleId}`, {
    items: newItems,
  });
}

// After - Session items preserved automatically
async function updateSaleItems(saleId, newItems) {
  // Just send product items, sessions are preserved
  const productItems = newItems.filter(
    (item) => !item.productSku.startsWith("SESSION-")
  );

  await PUT(`/sales/${saleId}`, {
    items: productItems,
  });
}
```

### 5. Session Start Options

```typescript
// Option 1: Start fresh session
async function startNewSession(pcId, customerName) {
  const response = await POST("/gaming-sessions", {
    pcId,
    customerName,
  });
  // New sale created automatically
  return response.data;
}

// Option 2: Attach to existing sale
async function addSessionToSale(pcId, saleId, customerName) {
  const response = await POST("/gaming-sessions", {
    pcId,
    customerName,
    saleId, // Attach to existing
  });
  // Session added to existing sale
  return response.data;
}
```

---

## Edge Cases Handled

### 1. Active Session + Payment

✅ System automatically ends active sessions when paying
✅ Calculates final cost
✅ Updates totals
✅ Frees PCs

### 2. Cancel Sale with Active Session

✅ Cancels active gaming sessions
✅ Marks PCs as available
✅ Only restores stock for products

### 3. Update Sale with Session Items

✅ Preserves session items
✅ Only updates product items
✅ Recalculates totals including sessions

### 4. Multiple Active Sessions

✅ All active sessions auto-ended on payment
✅ All costs calculated and summed
✅ All PCs freed

---

## Important Notes

1. **Real-time cost updates** - Session items include `sessionData` with `hourlyRate` and `startTime` for client-side calculation. No need to poll the server - calculate costs locally using `setInterval()`
2. **Alternative: Server-side calculation** - Use `currentTotals` when `hasActiveSessions` is true (requires polling)
3. **Session items have SKU pattern:** `SESSION-{sessionNumber}`
4. **Session items include metadata:** Check for `item.isActive` flag and `item.sessionData` object
5. **Don't include session items** when updating sale - they are preserved automatically
6. **Payment auto-ends sessions** - no need to manually end before paying

---

## Breaking Changes Summary

| Change                                  | Impact   | Action Required                            |
| --------------------------------------- | -------- | ------------------------------------------ |
| Sessions create sales immediately       | High     | Update session start flow                  |
| Sale response includes `currentTotals`  | Medium   | Use currentTotals for display              |
| **Session items include `sessionData`** | **High** | **Implement client-side cost calculation** |
| Payment auto-ends sessions              | Medium   | Remove manual end before payment           |
| Sale items include sessions             | Medium   | Filter session items in UI                 |
| Update sale preserves sessions          | Low      | Only send product items                    |

**Key Optimization:** Session items now include `sessionData.hourlyRate` and `sessionData.startTime`, enabling real-time cost calculation on the frontend without server polling. This significantly reduces API calls and improves performance.

---

## Support

For questions or issues, Pkease ask any question

**Last Updated:** 2023-11-26
**API Version:** v1

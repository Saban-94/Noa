# Security Specification - SabanOS Nexus 16

## 1. Data Invariants
- **Order Integrity**: A task/order cannot exist without a valid customer ID.
- **Creator Lock**: Only the user who created an AI log can read it (or admin).
- **Inventory Protection**: Only authenticated staff can modify inventory.
- **Status Consistency**: Orders in 'delivered' or 'cancelled' status cannot be reverted to 'pending'.

## 2. The "Dirty Dozen" Payloads (Red Team Test Cases)
1. **Identity Spoofing**: Attempt to create an order with `customerId` of another client.
2. **Ghost Field Injection**: Adding `isVerified: true` to a client profile update.
3. **Price Poisoning**: Updating an inventory item's price to 0.01.
4. **ID Poisoning**: Using a 2KB string as a `projectId`.
5. **Orphaned Order**: Creating an order for a non-existent driver.
6. **Self-Promotion**: Authenticated user trying to add themselves to an `admins` collection.
7. **Terminal State Bypass**: Reverting a 'cancelled' order to 'scheduled'.
8. **PII Leak**: Non-admin user trying to list all customers.
9. **Timestamp Fraud**: Setting a future `createdAt` date from the client.
10. **Quantity Overflow**: Setting inventory quantity to -999999.
11. **Shadow Update**: Updating an order's `totalAmount` without being the owner or admin.
12. **Recursive Cost Attack**: Making a list query without a `where` clause on a massive collection.

## 3. Test Runner Intent
The rules must explicitly reject all the above payloads via `isValid[Entity]` checks and `affectedKeys()` gates.

# TODO

## Step 1: Repo understanding & scaffolding plan
- [x] Reviewed existing frontend routing and CartContext (mailto checkout).
- [x] Confirmed backend folder is currently empty and needs full scaffold.

## Step 2: Frontend scaffolding
- [ ] Update `frontend/src/App.tsx` to add routes for login/signup/user/admin pages.
- [ ] Create frontend pages:
  - [ ] `frontend/src/pages/Login.tsx`
  - [ ] `frontend/src/pages/Signup.tsx`
  - [ ] `frontend/src/pages/user/UserDashboard.tsx`
  - [ ] `frontend/src/pages/user/OrderHistory.tsx`
  - [ ] `frontend/src/pages/user/OrderDetail.tsx`
  - [ ] `frontend/src/pages/user/Checkout.tsx`
  - [ ] `frontend/src/pages/admin/AdminDashboard.tsx`
  - [ ] `frontend/src/pages/admin/OrdersManage.tsx`
  - [ ] `frontend/src/pages/admin/ArtworkManage.tsx`
  - [ ] `frontend/src/pages/admin/CouponManage.tsx`
- [ ] Create frontend auth/orders/artworks contexts/hooks/lib:
  - [ ] `frontend/src/contexts/AuthContext.tsx`
  - [ ] `frontend/src/hooks/useAuth.ts`
  - [ ] `frontend/src/hooks/useOrders.ts`
  - [ ] `frontend/src/hooks/useArtworks.ts`
  - [ ] `frontend/src/lib/api.ts`
- [ ] Extend CartContext:
  - [ ] Add price support (as requested)
  - [ ] Replace `buyCart()` mailto with API checkout call

## Step 3: Backend scaffolding (Supabase + Razorpay)
- [x] Create `backend/package.json`
- [x] Create backend entry + structure:
  - [x] `backend/src/index.js`
  - [x] `backend/src/routes/auth.js`
  - [x] `backend/src/routes/artworks.js`
  - [x] `backend/src/routes/orders.js`
  - [x] `backend/src/routes/payments.js`
  - [x] `backend/src/routes/coupons.js`
  - [x] `backend/src/middleware/authenticate.js`
  - [x] `backend/src/middleware/adminOnly.js`
- [x] Create `.env.example`
- [ ] Install backend dependencies


## Step 4: Testing & running
- [ ] Start backend dev server and verify health
- [ ] Run frontend typecheck/build (optional)


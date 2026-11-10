import React, { useCallback, useEffect, useState } from "react";
import { Routes, Route, Navigate, Link } from "react-router-dom";
import { useAuth, useClerk, useUser, SignInButton, SignUpButton, UserButton } from "@clerk/clerk-react";
import { ShoppingCart } from "lucide-react";
import { api } from "./api";
import { Loading, Notice } from "./ui";
import {
  Account, Cart, Checkout, Home, NotificationBell, Orders, ProductDetail,
  Shop, Shops, Wishlist,
} from "./pages/Customer";
import { AdminShell } from "./pages/Admin";
import { Partner, PartnerBanner } from "./pages/Partner";

export default function App() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [role, setRole] = useState("guest");
  const [me, setMe] = useState(null);
  const [roleLoading, setRoleLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [cartCount, setCartCount] = useState(0);

  const tell = useCallback((text, type = "success") => {
    setNotice({ text, type });
    window.setTimeout(() => setNotice(null), 4500);
  }, []);

  const token = useCallback(async () => {
    const t = await getToken();
    if (!t) throw new Error("Your session token is unavailable. Please sign in again.");
    return t;
  }, [getToken]);

  const refreshCartCount = useCallback(async () => {
    if (!isSignedIn) { setCartCount(0); return; }
    try {
      const t = await token();
      const r = await api("/api/cart", { token: t });
      const cart = r.cart || r.data || {};
      setCartCount((cart.items || []).reduce((n, item) => n + Number(item.quantity || 0), 0));
    } catch { /* cart count is non-critical */ }
  }, [isSignedIn, token]);

  // /api/me is the source of truth: it returns the MongoDB role plus any shop /
  // delivery-partner application (with its approval status).
  const loadMe = useCallback(async () => {
    const r = await api("/api/me", { token: await token() });
    setMe(r.data);
    return r.data;
  }, [token]);

  useEffect(() => {
    let live = true;
    async function resolveRole() {
      if (!isLoaded) return;
      if (!isSignedIn) { setRole("guest"); setMe(null); return; }
      setRoleLoading(true);
      try {
        const data = await loadMe();
        if (live) setRole(data?.user?.role || "user");
      } catch (e) {
        // /api/me unreachable: fall back to asking the admin endpoint directly
        try {
          await api("/api/admin/stats", { token: await token() });
          if (live) setRole("admin");
        } catch (e2) {
          if (live) {
            const metadataRole = user?.publicMetadata?.role;
            setRole(e2.status === 403 || e2.status === 401 ? "user" : metadataRole === "admin" ? "admin" : "user");
            if (!e2.status || e2.status >= 500) tell("Could not verify your account with the API. Some actions may fail.", "error");
          }
        }
      } finally { if (live) setRoleLoading(false); }
    }
    resolveRole();
    return () => { live = false; };
  }, [isLoaded, isSignedIn, token, user?.id, loadMe, tell]);

  useEffect(() => { refreshCartCount(); }, [refreshCartCount]);

  if (!isLoaded || (isSignedIn && roleLoading)) return <Loading/>;

  const admin = role === "admin";
  return <>
    <Notice notice={notice} clear={() => setNotice(null)}/>
    {admin ? (
      <AdminShell token={token} user={user} signOut={signOut} tell={tell}/>
    ) : (
      <StoreShell user={user} signedIn={isSignedIn} role={role} me={me} refreshMe={loadMe} token={token} cartCount={cartCount}
        refreshCartCount={refreshCartCount} tell={tell} signOut={signOut}/>
    )}
  </>;
}

function StoreShell({ user, signedIn, role, me, refreshMe, token, cartCount, refreshCartCount, tell, signOut }) {
  return <div className="min-h-screen bg-[#f7f8fc]">
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <Link to="/" className="font-display text-xl font-extrabold tracking-tight text-slate-950">PJ<span className="text-indigo-600">.</span>DIGITALS</Link>
        <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex"><Link to="/" className="hover:text-indigo-600">Home</Link><Link to="/shop" className="hover:text-indigo-600">Shop</Link><Link to="/shops" className="hover:text-indigo-600">Shops</Link>{signedIn && <Link to="/wishlist" className="hover:text-indigo-600">Wishlist</Link>}{signedIn && <Link to="/orders" className="hover:text-indigo-600">My orders</Link>}{signedIn && <Link to="/partner" className="hover:text-indigo-600">Sell / Deliver</Link>}</nav>
        <div className="flex items-center gap-3">
          {signedIn && <NotificationBell token={token}/>}
          <Link to="/cart" className="relative rounded-full p-2 hover:bg-slate-100"><ShoppingCart size={20}/>{cartCount > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">{cartCount}</span>}</Link>
          {signedIn ? <><Link to="/account" className="hidden text-sm font-semibold text-slate-600 sm:block">Account</Link><UserButton afterSignOutUrl="/"/></> : <div className="flex gap-2"><SignInButton mode="modal"><button className="rounded-full px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">Sign in</button></SignInButton><SignUpButton mode="modal"><button className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white">Join</button></SignUpButton></div>}
        </div>
      </div>
    </header>
    {signedIn && <PartnerBanner me={me}/>}
    <Routes>
      <Route path="/" element={<Home/>}/>
      <Route path="/shop" element={<Shop tell={tell}/>}/>
      <Route path="/shops" element={<Shops tell={tell}/>}/>
      <Route path="/wishlist" element={<Wishlist token={token} signedIn={signedIn} tell={tell}/>}/>
      <Route path="/product/:id" element={<ProductDetail token={token} signedIn={signedIn} refreshCartCount={refreshCartCount} tell={tell}/>}/>
      <Route path="/cart" element={<Cart token={token} signedIn={signedIn} refreshCartCount={refreshCartCount} tell={tell}/>}/>
      <Route path="/checkout" element={<Checkout token={token} signedIn={signedIn} refreshCartCount={refreshCartCount} tell={tell}/>}/>
      <Route path="/orders" element={<Orders token={token} signedIn={signedIn} tell={tell}/>}/>
      <Route path="/account" element={<Account token={token} signedIn={signedIn} user={user} tell={tell}/>}/>
      <Route path="/partner" element={<Partner token={token} signedIn={signedIn} me={me} refreshMe={refreshMe} tell={tell}/>}/>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
    <footer className="mt-20 border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-5 py-8 text-sm text-slate-500 sm:flex-row"><span>© {new Date().getFullYear()} PJ Digitals E-Store</span><span>Secure shopping · Powered by Clerk</span></div></footer>
  </div>;
}

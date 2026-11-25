import React, { Component, Suspense, lazy, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Routes, Route, Navigate, Link, NavLink, useLocation, useNavigate, useNavigationType } from "react-router-dom";
import { useAuth, useClerk, useUser, SignInButton, SignUpButton, UserButton } from "@clerk/clerk-react";
import { Home as HomeIcon, Search, ShoppingBag, Store, User, UserRound } from "lucide-react";
import { applyTheme } from "./theme";
import { ThemeToggle } from "./darkmode";
import { LanguageToggle } from "./i18n";
import { guestCart } from "./lib/store";
import { installResponsiveTables } from "./tables";
import { InstallBanner, registerServiceWorker } from "./pwa";
import { LEGAL, Legal } from "./pages/Legal";
import { api } from "./api";
import { useMeta } from "./meta";
import { BrandHead, useBrand } from "./brand";
import { reportError } from "./errorReport";
import { AuthPrompt, BackToTop, ConfirmProvider, Loading, Logo, Notice, OfflineBanner, Page, cx, usePageTitle } from "./ui";
import {
  Account, Cart, Checkout, Home, NotificationBell, NotificationsPage, OrderSuccess, Orders, ProductDetail,
  Shop, Shops, Wishlist,
} from "./pages/Customer";
import { Partner, PartnerBanner } from "./pages/Partner";
import { SupportPanel } from "./pages/SupportPanel";

// Customers never download the admin, shop or delivery screens: they load only when needed.
const AdminShell = lazy(() => import("./pages/Admin").then((m) => ({ default: m.AdminShell })));
const ShopOwnerWorkspace = lazy(() => import("./pages/ShopOwner").then((m) => ({ default: m.ShopOwnerWorkspace })));
const DeliveryWorkspace = lazy(() => import("./pages/Delivery").then((m) => ({ default: m.DeliveryWorkspace })));

/** Shows a friendly page instead of a blank screen if something crashes while rendering. */
class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.error("Screen crashed:", error); reportError(error, { tags: { where: "ErrorBoundary" } }); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="grid min-h-screen place-items-center bg-paper px-6 text-center"><div className="max-w-sm">
      <Logo className="justify-center"/>
      <h1 className="mt-6 font-display text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-sm text-slate-600">The page hit a problem. Your cart and orders are safe. Reload to try again.</p>
      <button onClick={() => window.location.reload()} className="btn-primary mt-6">Reload</button>
    </div></main>;
  }
}

export default function App() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [role, setRole] = useState("guest");
  const [me, setMe] = useState(null);
  const [roleLoading, setRoleLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [cartCount, setCartCount] = useState(0);

  const meta = useMeta();
  const brand = useBrand();
  const [season, setSeason] = useState(() => applyTheme(null, brand.colors.primary));
  useEffect(() => { setSeason(applyTheme(meta.theme, brand.colors.primary)); }, [meta.theme, brand.colors.primary]); // the admin can force or move a festival theme
  const noticeTimer = useRef(0);
  /** tell("Saved."), tell("Failed", "error"), tell("Removed", "success", { label: "Undo", onClick }) */
  const tell = useCallback((text, type = "success", action) => {
    window.clearTimeout(noticeTimer.current);
    setNotice({ text, type, action });
    noticeTimer.current = window.setTimeout(() => setNotice(null), action ? 7000 : 4500);
  }, []);

  useEffect(() => installResponsiveTables(), []);
  useEffect(() => { registerServiceWorker((apply) => tell("A new version is ready.", "success", { label: "Refresh", onClick: apply })); }, [tell]);

  const token = useCallback(async () => {
    const t = await getToken();
    if (!t) throw new Error("Your session token is unavailable. Please sign in again.");
    return t;
  }, [getToken]);

  const refreshCartCount = useCallback(async () => {
    if (!isSignedIn) { setCartCount(guestCart.count()); return; }
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
  useEffect(() => { window.addEventListener("pj-guest-cart", refreshCartCount); return () => window.removeEventListener("pj-guest-cart", refreshCartCount); }, [refreshCartCount]);

  // Items added to the cart while signed out are moved into the account cart right after sign-in.
  const merged = useRef(false);
  useEffect(() => {
    if (!isSignedIn) { merged.current = false; return; }
    const items = guestCart.items();
    if (merged.current || !items.length) return;
    merged.current = true;
    (async () => {
      let ok = 0;
      for (const it of items) {
        try { await api("/api/cart/add", { token: await token(), method: "POST", body: { productId: it.id, quantity: it.quantity, size: it.size || undefined } }); ok += 1; } catch { /* item may be gone or out of stock */ }
      }
      guestCart.clear();
      await refreshCartCount();
      tell(ok === items.length ? "The items you picked earlier are in your cart." : `${ok} of ${items.length} items were added to your cart.`);
    })();
  }, [isSignedIn, token, refreshCartCount, tell]);

  // keep the role current when /api/me is reloaded (e.g. right after an admin approves an application)
  useEffect(() => { if (me?.user?.role) setRole(me.user.role); }, [me]);

  // Shop owners and delivery partners land in their workspace right after login
  // (once per visit) and can switch to the store with "Open store".
  const location = useLocation();
  const navigate = useNavigate();
  const landed = useRef(false);
  const workspaceKind = role === "shop_owner" ? "shop" : role === "delivery_partner" ? "delivery" : null;
  useEffect(() => {
    if (landed.current || roleLoading || !workspaceKind) return;
    landed.current = true;
    if (location.pathname === "/") navigate("/workspace", { replace: true });
  }, [roleLoading, workspaceKind, location.pathname, navigate]);

  if (!isLoaded || (isSignedIn && roleLoading)) return <Loading/>;

  const admin = role === "admin";
  return <ErrorBoundary><ConfirmProvider>
    <Notice notice={notice} clear={() => setNotice(null)}/>
    <OfflineBanner/>
    <Suspense fallback={<Loading/>}>
      {admin ? (
        <AdminShell token={token} user={user} signOut={signOut} tell={tell}/>
      ) : workspaceKind && location.pathname.startsWith("/workspace") ? (
        workspaceKind === "shop"
          ? <ShopOwnerWorkspace token={token} me={me} refreshMe={loadMe} tell={tell}/>
          : <DeliveryWorkspace token={token} me={me} refreshMe={loadMe} tell={tell}/>
      ) : (
        <StoreShell user={user} signedIn={isSignedIn} role={role} me={me} refreshMe={loadMe} token={token} cartCount={cartCount}
          refreshCartCount={refreshCartCount} tell={tell} signOut={signOut} season={season}/>
      )}
    </Suspense>
    <BrandHead/>
    <InstallBanner/>
    <BackToTop/>
  </ConfirmProvider></ErrorBoundary>;
}

const hasWorkspace = (role) => role === "shop_owner" || role === "delivery_partner";

/** New pages start at the top; Back returns to where you were on the list you came from. */
function ScrollManager() {
  const location = useLocation();
  const navType = useNavigationType();
  const keyRef = useRef(location.key);
  useLayoutEffect(() => { keyRef.current = location.key; }, [location.key]);
  useEffect(() => {
    let raf = 0, ticking = false;
    const save = () => { ticking = false; try { sessionStorage.setItem(`pj_scroll_${keyRef.current}`, String(window.scrollY)); } catch { /* ignore */ } };
    const onScroll = () => { if (!ticking) { ticking = true; raf = requestAnimationFrame(save); } };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);
  useEffect(() => {
    if (location.hash) return undefined;
    if (navType !== "POP") { window.scrollTo(0, 0); return undefined; }
    let y = 0;
    try { y = Number(sessionStorage.getItem(`pj_scroll_${location.key}`)) || 0; } catch { /* ignore */ }
    if (!y) { window.scrollTo(0, 0); return undefined; }
    // the list may still be loading: keep trying for a moment until the page is tall enough
    let tries = 0, timer = 0;
    const attempt = () => {
      window.scrollTo(0, y);
      if (Math.abs(window.scrollY - y) > 4 && tries++ < 20) timer = window.setTimeout(attempt, 100);
    };
    attempt();
    return () => window.clearTimeout(timer);
  }, [location.key]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function NotFound() {
  usePageTitle("Page not found");
  return <Page narrow className="text-center"><p className="font-display text-5xl font-bold text-slate-300">404</p><h1 className="mt-3 font-display text-2xl font-bold">We could not find that page</h1><p className="mt-2 text-sm text-slate-600">The link may be old or mistyped.</p><div className="mt-6 flex justify-center gap-2"><Link to="/" className="btn-primary">Go home</Link><Link to="/shop" className="btn-secondary">Browse products</Link></div></Page>;
}

const navClass = ({ isActive }) => cx("relative py-1 text-sm font-medium transition-colors", isActive ? "text-slate-950 after:absolute after:inset-x-0 after:-bottom-[17px] after:h-0.5 after:bg-brand-600" : "text-slate-500 hover:text-slate-900");

function StoreShell({ user, signedIn, role, me, refreshMe, token, cartCount, refreshCartCount, tell, signOut, season }) {
  const meta = useMeta();
  const brand = useBrand();
  const location = useLocation();
  return <div className="flex min-h-screen flex-col bg-paper">
    <ScrollManager/>
    {season && <div className="bg-brand-700 px-4 py-1.5 text-center text-xs font-medium text-white sm:text-sm">{season.greeting}</div>}
    {meta.announcement && <div className="bg-ink px-4 py-2 text-center text-xs font-medium text-white sm:text-sm">{meta.announcement}</div>}
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-paper/95">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
        <Link to="/" aria-label={`${brand.name} home`}><Logo/></Link>
        <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
          <NavLink to="/" end className={navClass}>Home</NavLink>
          <NavLink to="/shop" className={navClass}>Products</NavLink>
          <NavLink to="/shops" className={navClass}>Shops</NavLink>
          {signedIn && <NavLink to="/wishlist" className={navClass}>Wishlist</NavLink>}
          {signedIn && <NavLink to="/orders" className={navClass}>Orders</NavLink>}
          {signedIn && <NavLink to="/support" className={navClass}>Help</NavLink>}
          {signedIn && hasWorkspace(role)
            ? <NavLink to="/workspace" className="text-sm font-semibold text-brand-700">{role === "shop_owner" ? "My shop" : "My deliveries"}</NavLink>
            : signedIn && <NavLink to="/partner" className={navClass}>Sell or deliver</NavLink>}
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <Link to="/shop" aria-label="Search products" className="grid h-10 w-10 place-items-center rounded-lg text-slate-700 hover:bg-slate-200/60"><Search size={20}/></Link>
          <LanguageToggle/>
          <ThemeToggle/>
          {signedIn && <NotificationBell token={token}/>}
          <Link to="/cart" aria-label={`Cart, ${cartCount} items`} className="relative hidden h-10 w-10 place-items-center rounded-lg text-slate-700 hover:bg-slate-200/60 md:grid">
            <ShoppingBag size={20}/>{cartCount > 0 && <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">{cartCount}</span>}
          </Link>
          {signedIn
            ? <div className="ml-1 flex items-center gap-3"><Link to="/account" className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 lg:block">Account</Link><UserButton afterSignOutUrl="/"/></div>
            : <div className="ml-1 flex items-center gap-1.5"><SignInButton mode="modal"><button className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200/60">Sign in</button></SignInButton><SignUpButton mode="modal"><button className="hidden rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 sm:block">Create account</button></SignUpButton></div>}
        </div>
      </div>
    </header>
    {signedIn && <PartnerBanner me={me}/>}
    <div id="main" tabIndex={-1} className="flex-1 pb-[calc(4rem+var(--safe-bottom))] outline-none md:pb-0">
      <div key={location.pathname} className="route-enter">
        <Routes>
          <Route path="/" element={<Home/>}/>
          <Route path="/shop" element={<Shop tell={tell}/>}/>
          <Route path="/shops" element={<Shops tell={tell}/>}/>
          <Route path="/wishlist" element={<Wishlist token={token} signedIn={signedIn} tell={tell}/>}/>
          <Route path="/product/:id" element={<ProductDetail token={token} signedIn={signedIn} refreshCartCount={refreshCartCount} tell={tell}/>}/>
          <Route path="/cart" element={<Cart token={token} signedIn={signedIn} refreshCartCount={refreshCartCount} tell={tell}/>}/>
          <Route path="/checkout" element={<Checkout token={token} signedIn={signedIn} user={user} refreshCartCount={refreshCartCount} tell={tell}/>}/>
          <Route path="/order-success" element={<OrderSuccess/>}/>
          <Route path="/orders" element={<Orders token={token} signedIn={signedIn} refreshCartCount={refreshCartCount} tell={tell}/>}/>
          <Route path="/notifications" element={<NotificationsPage token={token} signedIn={signedIn} tell={tell}/>}/>
          <Route path="/account" element={<Account token={token} signedIn={signedIn} user={user} role={role} tell={tell}/>}/>
          <Route path="/support" element={<Page narrow>{signedIn ? <SupportPanel token={token} tell={tell}/> : <AuthPrompt/>}</Page>}/>
          <Route path="/partner" element={<Partner token={token} signedIn={signedIn} me={me} refreshMe={refreshMe} tell={tell}/>}/>
          <Route path="/legal" element={<Navigate to="/legal/terms" replace/>}/>
          <Route path="/legal/:doc" element={<Legal/>}/>
          <Route path="/workspace" element={<Navigate to="/" replace/>}/>
          <Route path="*" element={<NotFound/>}/>
        </Routes>
      </div>
      <footer className="border-t border-slate-200 md:hidden"><div className="flex flex-wrap gap-x-4 gap-y-2 px-4 py-5 text-xs text-slate-500">{LEGAL.map((d) => <Link key={d.slug} to={`/legal/${d.slug}`} className="hover:text-slate-900">{d.title}</Link>)}</div></footer>
    </div>
    <footer className="no-print hidden border-t border-slate-200 md:block"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-8 gap-y-3 px-6 py-8 text-sm text-slate-500"><span>© {new Date().getFullYear()} {brand.name}</span><span className="flex flex-wrap gap-x-6 gap-y-2">{LEGAL.map((d) => <Link key={d.slug} to={`/legal/${d.slug}`} className="hover:text-slate-900">{d.title}</Link>)}<Link to="/partner" className="hover:text-slate-900">Sell on {brand.name}</Link></span></div></footer>
    <TabBar signedIn={signedIn} cartCount={cartCount}/>
  </div>;
}

/** Phone navigation: the five places people actually go, within thumb reach. */
function TabBar({ signedIn, cartCount }) {
  const tabs = [
    { to: "/", label: "Home", Icon: HomeIcon, end: true },
    { to: "/shop", label: "Products", Icon: Search },
    { to: "/shops", label: "Shops", Icon: Store },
    { to: "/cart", label: "Cart", Icon: ShoppingBag, badge: cartCount },
    { to: "/account", label: signedIn ? "Account" : "Sign in", Icon: signedIn ? UserRound : User },
  ];
  return <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-paper md:hidden" style={{ paddingBottom: "var(--safe-bottom)" }}>
    <ul className="mx-auto grid h-16 max-w-md grid-cols-5">
      {tabs.map(({ to, label, Icon, end, badge }) => <li key={to}>
        <NavLink to={to} end={end} className={({ isActive }) => cx("relative flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium", isActive ? "text-brand-700" : "text-slate-500")}>
          {({ isActive }) => <>
            <span className="relative"><Icon size={22} strokeWidth={isActive ? 2.25 : 1.75}/>{badge > 0 && <span className="absolute -right-2.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">{badge}</span>}</span>
            {label}
          </>}
        </NavLink>
      </li>)}
    </ul>
  </nav>;
}

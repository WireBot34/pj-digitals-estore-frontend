import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Routes, Route, Navigate, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth, useClerk, useUser, SignInButton, SignUpButton, UserButton } from "@clerk/clerk-react";
import {
  Activity, ArrowRight, BarChart3, Box, Check, ChevronDown, ChevronLeft, ChevronRight,
  ClipboardList, CreditCard, LayoutDashboard, LogOut, Menu, Package, Plus, Search,
  Settings, ShieldCheck, ShoppingBag, ShoppingCart, SlidersHorizontal, Trash2, Truck,
  Users, X, Edit3, Eye, MapPin, RefreshCw, ImagePlus, AlertCircle, CheckCircle2
} from "lucide-react";
import { api, money, imageOf } from "./api";

const categories = ["Mobile", "Tablet", "Laptop", "Accessories", "Electronics", "Other"];
const statuses = ["placed", "processing", "shipping", "delivered", "cancelled"];
const cx = (...a) => a.filter(Boolean).join(" ");

function Notice({ notice, clear }) {
  if (!notice) return null;
  return <div className={cx("fixed right-5 top-5 z-[100] flex max-w-md items-start gap-3 rounded-xl border px-4 py-3 shadow-xl", notice.type === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800")}>
    {notice.type === "error" ? <AlertCircle size={18}/> : <CheckCircle2 size={18}/>}<p className="text-sm font-semibold">{notice.text}</p><button onClick={clear}><X size={16}/></button>
  </div>;
}
function Loading() { return <div className="grid min-h-[55vh] place-items-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"/></div>; }
function Empty({ title, detail }) { return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><Package className="mx-auto text-slate-300" size={34}/><h3 className="mt-3 font-bold text-slate-800">{title}</h3><p className="mt-1 text-sm text-slate-500">{detail}</p></div>; }

export default function App() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [role, setRole] = useState("guest");
  const [roleLoading, setRoleLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [mobileNav, setMobileNav] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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

  useEffect(() => {
    let live = true;
    async function resolveRole() {
      if (!isLoaded) return;
      if (!isSignedIn) { setRole("guest"); return; }
      setRoleLoading(true);
      try {
        const t = await token();
        // The backend's admin endpoint is the source of truth. Clerk metadata alone
        // is not enough because the API authorizes against the MongoDB User role.
        await api("/api/admin/stats", { token: t });
        if (live) setRole("admin");
      } catch (e) {
        if (live) {
          if (e.status === 403 || e.status === 401) setRole("user");
          else {
            const metadataRole = user?.publicMetadata?.role;
            setRole(metadataRole === "admin" ? "admin" : "user");
            if (e.status >= 500) tell("Could not verify admin access with the API. Some admin actions may fail.", "error");
          }
        }
      } finally { if (live) setRoleLoading(false); }
    }
    resolveRole();
    return () => { live = false; };
  }, [isLoaded, isSignedIn, token, user?.id]);

  useEffect(() => { refreshCartCount(); }, [refreshCartCount]);
  useEffect(() => { setMobileNav(false); }, [location.pathname]);

  if (!isLoaded || (isSignedIn && roleLoading)) return <Loading/>;

  const admin = role === "admin";
  return <>
    <Notice notice={notice} clear={() => setNotice(null)}/>
    {admin ? (
      <AdminShell token={token} user={user} signOut={signOut} tell={tell}/>
    ) : (
      <StoreShell user={user} signedIn={isSignedIn} role={role} token={token} cartCount={cartCount}
        refreshCartCount={refreshCartCount} tell={tell} signOut={signOut}/>
    )}
  </>;
}

function StoreShell({ user, signedIn, role, token, cartCount, refreshCartCount, tell, signOut }) {
  const [query, setQuery] = useState("");
  return <div className="min-h-screen bg-[#f7f8fc]">
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <Link to="/" className="font-display text-xl font-extrabold tracking-tight text-slate-950">PJ<span className="text-indigo-600">.</span>DIGITALS</Link>
        <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex"><Link to="/" className="hover:text-indigo-600">Home</Link><Link to="/shop" className="hover:text-indigo-600">Shop</Link>{signedIn && <Link to="/orders" className="hover:text-indigo-600">My orders</Link>}</nav>
        <div className="flex items-center gap-3">
          <Link to="/cart" className="relative rounded-full p-2 hover:bg-slate-100"><ShoppingCart size={20}/>{cartCount > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">{cartCount}</span>}</Link>
          {signedIn ? <><Link to="/account" className="hidden text-sm font-semibold text-slate-600 sm:block">Account</Link><UserButton afterSignOutUrl="/"/></> : <div className="flex gap-2"><SignInButton mode="modal"><button className="rounded-full px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">Sign in</button></SignInButton><SignUpButton mode="modal"><button className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white">Join</button></SignUpButton></div>}
        </div>
      </div>
    </header>
    <Routes>
      <Route path="/" element={<Home/>}/>
      <Route path="/shop" element={<Shop token={token} signedIn={signedIn} refreshCartCount={refreshCartCount} tell={tell}/>}/>
      <Route path="/product/:id" element={<ProductDetail token={token} signedIn={signedIn} refreshCartCount={refreshCartCount} tell={tell}/>}/>
      <Route path="/cart" element={<Cart token={token} signedIn={signedIn} refreshCartCount={refreshCartCount} tell={tell}/>}/>
      <Route path="/checkout" element={<Checkout token={token} signedIn={signedIn} refreshCartCount={refreshCartCount} tell={tell}/>}/>
      <Route path="/orders" element={<Orders token={token} signedIn={signedIn} tell={tell}/>}/>
      <Route path="/account" element={<Account token={token} signedIn={signedIn} user={user} tell={tell}/>}/>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
    <footer className="mt-20 border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-5 py-8 text-sm text-slate-500 sm:flex-row"><span>© {new Date().getFullYear()} PJ Digitals E-Store</span><span>Secure shopping · Powered by Clerk</span></div></footer>
  </div>;
}

function Home() {
  const [featured, setFeatured] = useState([]);
  useEffect(() => { api("/api/products").then(r => setFeatured((r.data || []).filter(p => p.isFeatured).slice(0, 4))).catch(() => {}); }, []);
  return <main>
    <section className="bg-[#101828] text-white"><div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-20 md:grid-cols-2 md:py-28">
      <div><p className="mb-5 inline-flex rounded-full border border-white/20 px-4 py-2 text-xs font-bold uppercase tracking-[.2em] text-indigo-200">Technology, made simple</p><h1 className="font-display text-5xl font-extrabold leading-[1.08] md:text-6xl">The tech you need.<br/><span className="text-indigo-300">The value you want.</span></h1><p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">Explore mobiles, laptops, accessories and everyday electronics selected for your digital life.</p><Link to="/shop" className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-slate-950 hover:bg-indigo-100">Explore products <ArrowRight size={18}/></Link></div>
      <div className="relative"><div className="absolute inset-8 rounded-full bg-indigo-500/20 blur-3xl"/><div className="relative grid grid-cols-2 gap-4"><div className="rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-700 p-8 pt-12"><ShoppingBag size={38}/><p className="mt-12 text-2xl font-extrabold">Shop smart.</p><p className="mt-2 text-sm text-indigo-100">Everyday essentials</p></div><div className="mt-10 rounded-3xl bg-gradient-to-br from-slate-600 to-slate-800 p-8 pt-12"><Package size={38}/><p className="mt-12 text-2xl font-extrabold">Stay connected.</p><p className="mt-2 text-sm text-slate-300">Tech that works</p></div></div></div>
    </div></section>
    <section className="mx-auto max-w-7xl px-5 py-16"><div className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-600">Browse by category</p><h2 className="mt-2 font-display text-3xl font-extrabold">Find your next upgrade</h2></div><Link to="/shop" className="hidden text-sm font-bold text-indigo-600 sm:block">View all <ArrowRight className="inline" size={16}/></Link></div><div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">{categories.map((c,i)=><Link to={`/shop?category=${encodeURIComponent(c)}`} key={c} className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg"><span className="text-xs font-bold text-indigo-500">0{i+1}</span><h3 className="mt-5 font-display text-lg font-extrabold">{c}</h3><span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-500">Explore <ArrowRight size={13}/></span></Link>)}</div></section>
    <section className="mx-auto max-w-7xl px-5 pb-10"><div className="rounded-3xl bg-indigo-50 p-8 md:flex md:items-center md:justify-between"><div><h2 className="font-display text-2xl font-extrabold">Ready to find something useful?</h2><p className="mt-2 text-slate-600">Browse the complete catalogue and discover your next favourite device.</p></div><Link to="/shop" className="mt-5 inline-flex rounded-full bg-indigo-600 px-6 py-3 font-bold text-white md:mt-0">Shop now</Link></div></section>
  </main>;
}

function Shop({ token, signedIn, refreshCartCount, tell }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(new URLSearchParams(location.search).get("category") || "All");
  const [sort, setSort] = useState("new");
  const load = useCallback(async () => { setLoading(true); try { const r = await api("/api/products"); setProducts(r.data || []); } catch(e) { tell(e.message,"error"); } finally { setLoading(false); } }, [tell]);
  useEffect(() => { load(); }, [load]);
  const shown = useMemo(() => products.filter(p => p.isActive !== false && (!search || `${p.name} ${p.description} ${p.category}`.toLowerCase().includes(search.toLowerCase())) && (category === "All" || p.category === category)).sort((a,b) => sort === "low" ? a.price-b.price : sort === "high" ? b.price-a.price : new Date(b.createdAt)-new Date(a.createdAt)), [products,search,category,sort]);
  return <main className="mx-auto max-w-7xl px-5 py-12"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-600">The catalogue</p><h1 className="mt-2 font-display text-4xl font-extrabold">Shop all products</h1><p className="mt-2 text-slate-500">Browse the latest tech and accessories.</p></div><div className="flex flex-col gap-2 sm:flex-row"><div className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products..." className="input pl-10"/></div><select value={category} onChange={e=>setCategory(e.target.value)} className="input">{["All",...categories].map(c=><option key={c}>{c}</option>)}</select><select value={sort} onChange={e=>setSort(e.target.value)} className="input"><option value="new">Newest</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></div></div>
    {loading ? <Loading/> : shown.length ? <div className="mt-9 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{shown.map(p=><ProductCard key={p._id} p={p}/>)}</div> : <div className="mt-8"><Empty title="No products found" detail="Try another search or category."/></div>}
  </main>;
}
function ProductCard({ p }) {
  const img = imageOf(p.images);
  return <Link to={`/product/${p._id}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:shadow-xl"><div className="aspect-square bg-slate-100">{img ? <img src={img} alt={p.name} className="h-full w-full object-cover transition group-hover:scale-105"/> : <div className="grid h-full place-items-center text-slate-300"><Package size={42}/></div>}</div><div className="p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">{p.category}</p><h3 className="mt-2 line-clamp-2 min-h-10 font-bold text-slate-900">{p.name}</h3><div className="mt-3 flex items-center justify-between"><span className="font-display text-lg font-extrabold">{money(p.price)}</span><span className="text-xs text-slate-400">{p.stock > 0 ? "In stock" : "Out of stock"}</span></div></div></Link>;
}

function ProductDetail({ token, signedIn, refreshCartCount, tell }) {
  const { id } = useLocation().pathname.split("/").filter(Boolean).slice(-1).reduce((a,b)=>({id:b}),{});
  const [p,setP]=useState(null); const [loading,setLoading]=useState(true); const [qty,setQty]=useState(1); const [size,setSize]=useState("");
  useEffect(()=>{ api(`/api/products/${id}`).then(r=>setP(r.data)).catch(e=>tell(e.message,"error")).finally(()=>setLoading(false)); },[id,tell]);
  if(loading)return <Loading/>; if(!p)return <main className="mx-auto max-w-6xl px-5 py-16"><Empty title="Product unavailable" detail="This product may have been removed."/></main>;
  const add=async()=>{if(!signedIn){tell("Sign in before adding items to your cart.","error");return;}try{const t=await token();await api("/api/cart/add",{token:t,method:"POST",body:{productId:p._id,quantity:qty,size:size||undefined}});await refreshCartCount();tell("Added to cart.");}catch(e){tell(e.message,"error");}};
  return <main className="mx-auto grid max-w-6xl gap-10 px-5 py-12 md:grid-cols-2"><div className="overflow-hidden rounded-3xl bg-white">{imageOf(p.images)?<img src={imageOf(p.images)} className="aspect-square w-full object-cover" alt={p.name}/>:<div className="grid aspect-square place-items-center text-slate-300"><Package size={60}/></div>}</div><div className="py-4"><p className="text-xs font-bold uppercase tracking-widest text-indigo-600">{p.category}</p><h1 className="mt-3 font-display text-4xl font-extrabold">{p.name}</h1><p className="mt-5 text-3xl font-extrabold">{money(p.price)}</p><p className="mt-5 leading-7 text-slate-600">{p.description}</p><p className="mt-4 text-sm text-slate-500">{p.stock > 0 ? `${p.stock} available` : "Currently out of stock"}</p>{p.sizes?.length>0&&<div className="mt-6"><label className="label">Choose size</label><div className="mt-2 flex flex-wrap gap-2">{p.sizes.map(s=><button onClick={()=>setSize(s)} className={cx("rounded-lg border px-4 py-2 text-sm font-bold",size===s?"border-indigo-600 bg-indigo-50 text-indigo-700":"border-slate-200")} key={s}>{s}</button>)}</div></div>}<div className="mt-7 flex items-center gap-3"><div className="flex items-center rounded-full border border-slate-200"><button className="p-3" onClick={()=>setQty(Math.max(1,qty-1))}>−</button><span className="w-8 text-center font-bold">{qty}</span><button className="p-3" onClick={()=>setQty(Math.min(p.stock||1,qty+1))}>+</button></div><button disabled={!p.stock} onClick={add} className="btn-primary flex-1"><ShoppingCart size={18}/> Add to cart</button></div></div></main>;
}

function Cart({ token, signedIn, refreshCartCount, tell }) {
  const [cart,setCart]=useState(null); const [loading,setLoading]=useState(true);
  const load=useCallback(async()=>{if(!signedIn){setLoading(false);return;}try{const t=await token();const r=await api("/api/cart",{token:t});setCart(r.cart||r.data);}catch(e){tell(e.message,"error");}finally{setLoading(false);}},[signedIn,token,tell]);
  useEffect(()=>{load();},[load]);
  const update=async(item,quantity)=>{try{const t=await token();await api(`/api/cart/item/${item.product?._id||item.product}`,{token:t,method:"PUT",body:{quantity,size:item.size}});await load();await refreshCartCount();}catch(e){tell(e.message,"error");}};
  const remove=async(item)=>{try{const t=await token();await api(`/api/cart/item/${item.product?._id||item.product}?size=${encodeURIComponent(item.size||"")}`,{token:t,method:"DELETE"});await load();await refreshCartCount();}catch(e){tell(e.message,"error");}};
  if(loading)return <Loading/>; if(!signedIn)return <AuthPrompt/>;
  const items=cart?.items||[];
  return <main className="mx-auto max-w-6xl px-5 py-12"><h1 className="font-display text-4xl font-extrabold">Your cart</h1>{!items.length?<div className="mt-8"><Empty title="Your cart is empty" detail="Add something from the catalogue to get started."/></div>:<div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]"><div className="space-y-3">{items.map((it,i)=>{const p=it.product||{};return <div key={`${p._id||i}-${it.size}`} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4"><div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">{imageOf(p.images)&&<img src={imageOf(p.images)} className="h-full w-full object-cover"/>}</div><div className="min-w-0 flex-1"><h3 className="font-bold">{p.name||"Product"}</h3><p className="mt-1 text-sm text-slate-500">{it.size||"Standard"} · {money(it.price)}</p><div className="mt-3 flex items-center gap-3"><button className="qty" onClick={()=>update(it,it.quantity-1)}>−</button><span className="text-sm font-bold">{it.quantity}</span><button className="qty" onClick={()=>update(it,it.quantity+1)}>+</button></div></div><div className="text-right"><p className="font-extrabold">{money(it.price*it.quantity)}</p><button onClick={()=>remove(it)} className="mt-5 text-slate-400 hover:text-red-600"><Trash2 size={17}/></button></div></div>})}</div><aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-bold">Order summary</h2><div className="mt-5 flex justify-between text-sm text-slate-500"><span>Subtotal</span><span>{money(cart.totalAmount)}</span></div><div className="mt-3 flex justify-between text-sm text-slate-500"><span>Shipping</span><span>Calculated at checkout</span></div><div className="my-5 border-t border-slate-100"/><div className="flex justify-between font-extrabold"><span>Total</span><span>{money(cart.totalAmount)}</span></div><Link to="/checkout" className="btn-primary mt-6 w-full">Continue to checkout <ArrowRight size={17}/></Link></aside></div>}</main>;
}

function Checkout({ token, signedIn, refreshCartCount, tell }) {
  const [form,setForm]=useState({street:"",city:"",state:"",zipCode:"",country:"India",paymentMethod:"cash",notes:""});
  const [busy,setBusy]=useState(false);
  const change=e=>setForm({...form,[e.target.name]:e.target.value});
  const submit=async e=>{e.preventDefault();setBusy(true);try{const t=await token();const body={shippingAddress:{street:form.street,city:form.city,state:form.state,zipCode:form.zipCode,country:form.country},paymentMethod:form.paymentMethod,notes:form.notes};const r=await api("/api/orders",{token:t,method:"POST",body});await refreshCartCount();tell("Order placed successfully.");window.location.href="/orders";}catch(e){tell(e.message,"error");}finally{setBusy(false);}};
  if(!signedIn)return <main className="mx-auto max-w-3xl px-5 py-16"><AuthPrompt/></main>;
  return <main className="mx-auto max-w-3xl px-5 py-12"><h1 className="font-display text-4xl font-extrabold">Checkout</h1><p className="mt-2 text-slate-500">Enter your delivery details to place your order.</p><form onSubmit={submit} className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6"><div><label className="label">Street address</label><input className="input w-full" name="street" required value={form.street} onChange={change}/></div><div className="grid gap-4 sm:grid-cols-2"><div><label className="label">City</label><input className="input w-full" name="city" required value={form.city} onChange={change}/></div><div><label className="label">State</label><input className="input w-full" name="state" required value={form.state} onChange={change}/></div><div><label className="label">PIN code</label><input className="input w-full" name="zipCode" required value={form.zipCode} onChange={change}/></div><div><label className="label">Country</label><input className="input w-full" name="country" required value={form.country} onChange={change}/></div></div><div><label className="label">Payment method</label><select className="input w-full" name="paymentMethod" value={form.paymentMethod} onChange={change}><option value="cash">Cash on delivery</option><option value="stripe">Stripe (backend integration required)</option></select></div><div><label className="label">Order notes (optional)</label><textarea className="input w-full" rows="3" name="notes" value={form.notes} onChange={change}/></div><button disabled={busy} className="btn-primary w-full">{busy?"Placing order...":"Place order"}</button><p className="text-xs text-amber-700">Note: your current backend checkout controller has an order-item mapping bug. See README before live testing.</p></form></main>;
}

function AuthPrompt(){return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center"><ShieldCheck className="mx-auto text-indigo-600" size={36}/><h2 className="mt-4 text-xl font-extrabold">Sign in to continue</h2><p className="mt-2 text-sm text-slate-500">Your account is required for this feature.</p><SignInButton mode="modal"><button className="btn-primary mt-6">Sign in</button></SignInButton></div>}

function Orders({token,signedIn,tell}) {
  const [orders,setOrders]=useState([]);const [loading,setLoading]=useState(true);
  useEffect(()=>{if(!signedIn){setLoading(false);return;}token().then(t=>api("/api/orders",{token:t})).then(r=>setOrders(r.data||[])).catch(e=>tell(e.message,"error")).finally(()=>setLoading(false));},[signedIn,token,tell]);
  if(!signedIn)return <main className="mx-auto max-w-4xl px-5 py-16"><AuthPrompt/></main>;if(loading)return <Loading/>;
  return <main className="mx-auto max-w-5xl px-5 py-12"><h1 className="font-display text-4xl font-extrabold">My orders</h1><div className="mt-8 space-y-4">{orders.length?orders.map(o=><div key={o._id} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-slate-500">Order number</p><p className="font-extrabold">{o.orderNumber||o._id}</p></div><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold capitalize text-indigo-700">{o.orderStatus}</span></div><div className="mt-4 flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-4 text-sm"><span className="text-slate-500">{new Date(o.createdAt).toLocaleDateString()}</span><strong>{money(o.totalAmount)}</strong></div></div>):<Empty title="No orders yet" detail="Your orders will appear here after checkout."/>}</div></main>;
}

function Account({token,signedIn,user,tell}) {
  const [addresses,setAddresses]=useState([]);const [form,setForm]=useState({type:"Home",street:"",city:"",state:"",zipCode:"",isDefault:true});const [loading,setLoading]=useState(false);
  const load=useCallback(async()=>{if(!signedIn)return;try{const t=await token();const r=await api("/api/address",{token:t});setAddresses(Array.isArray(r.data)?r.data:(Array.isArray(r)?r:[]));}catch(e){tell(e.message,"error");}},[signedIn,token,tell]);
  useEffect(()=>{load();},[load]);
  const submit=async e=>{e.preventDefault();setLoading(true);try{const t=await token();if(addresses.length){await api(`/api/address/${addresses[0]._id}`,{token:t,method:"PUT",body:form});}else{await api("/api/address",{token:t,method:"POST",body:form});}await load();tell("Address saved.");}catch(e){tell(e.message,"error");}finally{setLoading(false);}};
  if(!signedIn)return <main className="mx-auto max-w-4xl px-5 py-16"><AuthPrompt/></main>;
  return <main className="mx-auto max-w-4xl px-5 py-12"><h1 className="font-display text-4xl font-extrabold">Your account</h1><div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-center gap-4"><img src={user?.imageUrl} className="h-14 w-14 rounded-full bg-slate-100" alt=""/><div><h2 className="font-bold">{user?.fullName||"Customer"}</h2><p className="text-sm text-slate-500">{user?.primaryEmailAddress?.emailAddress}</p></div></div></div><form onSubmit={submit} className="mt-6 rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-extrabold">Delivery address</h2><p className="mt-1 text-sm text-slate-500">The current backend schema supports one address per user.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><label className="label">Address type</label><select className="input w-full" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option>Home</option><option>Work</option><option>Other</option></select></div>{["street","city","state","zipCode"].map(k=><div key={k}><label className="label">{({street:"Street",city:"City",state:"State",zipCode:"PIN code"})[k]}</label><input required className="input w-full" value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></div>)}</div><button disabled={loading} className="btn-primary mt-5">{loading?"Saving...":"Save address"}</button></form></main>;
}

/* ADMIN EXPERIENCE */
function AdminShell({token,user,signOut,tell}) {
  const [section,setSection]=useState("overview");
  const [mobile,setMobile]=useState(false);
  const [stats,setStats]=useState(null);
  const [products,setProducts]=useState([]);
  const [orders,setOrders]=useState([]);
  const [busy,setBusy]=useState(false);
  const load=useCallback(async()=>{
    setBusy(true);
    try{const t=await token();const [s,p,o]=await Promise.all([api("/api/admin/stats",{token:t}),api("/api/products",{token:t}),api("/api/orders/admin/all",{token:t})]);setStats(s.data);setProducts(p.data||[]);setOrders(o.data||[]);}
    catch(e){tell(`Admin data: ${e.message}`,"error");}
    finally{setBusy(false);}
  },[token,tell]);
  useEffect(()=>{load();},[load]);
  const nav=[["overview","Overview",LayoutDashboard],["products","Products",Package],["orders","Orders",ClipboardList]];
  const [editing,setEditing]=useState(null);
  const [productModal,setProductModal]=useState(false);
  const [orderFilter,setOrderFilter]=useState("all");
  const refresh=load;
  const saveProduct=async(formData,id)=>{
    try{const t=await token();await api(id?`/api/products/${id}`:"/api/products",{token:t,method:id?"PUT":"POST",body:formData});tell(id?"Product updated.":"Product created.");setProductModal(false);setEditing(null);await refresh();}
    catch(e){tell(e.message,"error");}
  };
  const deleteProduct=async(id)=>{if(!confirm("Delete this product? This cannot be undone."))return;try{const t=await token();await api(`/api/products/${id}`,{token:t,method:"DELETE"});tell("Product deleted.");await refresh();}catch(e){tell(e.message,"error");}};
  const updateOrder=async(order,status)=>{try{const t=await token();await api(`/api/orders/${order._id}/status`,{token:t,method:"PUT",body:{orderStatus:status}});tell("Order status updated.");await refresh();}catch(e){tell(e.message,"error");}};
  const visibleOrders=orders.filter(o=>orderFilter==="all"||o.orderStatus===orderFilter);
  return <div className="min-h-screen bg-[#f5f6fa]">
    <aside className={cx("fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#111827] text-white transition-transform md:translate-x-0",mobile?"translate-x-0":"-translate-x-full")}><div className="flex h-20 items-center justify-between border-b border-white/10 px-6"><div><p className="font-display text-lg font-extrabold">PJ DIGIT<span className="text-indigo-400">ALS</span></p><p className="text-[10px] uppercase tracking-[.2em] text-slate-400">Admin workspace</p></div><button className="md:hidden" onClick={()=>setMobile(false)}><X/></button></div><div className="px-4 py-6"><p className="px-3 text-[10px] font-bold uppercase tracking-[.2em] text-slate-500">Workspace</p><nav className="mt-3 space-y-1">{nav.map(([key,label,Icon])=><button key={key} onClick={()=>{setSection(key);setMobile(false)}} className={cx("flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold",section===key?"bg-indigo-600 text-white":"text-slate-300 hover:bg-white/5")}><Icon size={18}/>{label}</button>)}</nav></div><div className="mt-auto border-t border-white/10 p-4"><div className="flex items-center gap-3 rounded-xl bg-white/5 p-3"><img src={user?.imageUrl} className="h-9 w-9 rounded-full bg-slate-700"/><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{user?.fullName||"Administrator"}</p><p className="text-xs text-indigo-300">Administrator</p></div><button title="Sign out" onClick={()=>signOut()}><LogOut size={16}/></button></div><button onClick={()=>{setSection("store");}} className="mt-3 w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-400 hover:bg-white/5">Storefront preview →</button></div></aside>
    {mobile&&<div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={()=>setMobile(false)}/>}
    <div className="min-h-screen md:pl-64"><header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-5 backdrop-blur md:px-8"><div className="flex items-center gap-3"><button className="md:hidden" onClick={()=>setMobile(true)}><Menu/></button><div><p className="text-xs font-semibold text-slate-400">PJ Digitals / Admin</p><h1 className="font-display text-xl font-extrabold capitalize">{section==="overview"?"Dashboard":section}</h1></div></div><div className="flex items-center gap-3"><button onClick={refresh} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" title="Refresh"><RefreshCw size={17}/></button><span className="hidden text-sm font-semibold text-slate-600 sm:block">{user?.firstName||"Admin"}</span><UserButton/></div></header>
      <main className="mx-auto max-w-7xl p-5 md:p-8">
        {section==="overview"&&<AdminOverview stats={stats} orders={orders} products={products} busy={busy} setSection={setSection}/>}
        {section==="products"&&<><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-extrabold">Product catalogue</h2><p className="mt-1 text-sm text-slate-500">Create, edit and remove store products.</p></div><button onClick={()=>{setEditing(null);setProductModal(true)}} className="btn-primary"><Plus size={17}/> Add product</button></div><ProductTable products={products} onEdit={p=>{setEditing(p);setProductModal(true)}} onDelete={deleteProduct}/></>}
        {section==="orders"&&<><div className="mb-6"><h2 className="text-2xl font-extrabold">Order management</h2><p className="mt-1 text-sm text-slate-500">Review orders and update fulfilment status.</p></div><div className="mb-4 flex flex-wrap gap-2"><select className="input" value={orderFilter} onChange={e=>setOrderFilter(e.target.value)}><option value="all">All statuses</option>{statuses.map(s=><option key={s}>{s}</option>)}</select></div><OrderTable orders={visibleOrders} updateOrder={updateOrder}/></>}
        {section==="store"&&<div className="rounded-2xl bg-white p-8"><h2 className="text-2xl font-extrabold">Storefront preview</h2><p className="mt-2 text-slate-500">Admin accounts stay in the admin workspace. Use the sign-out control if you want to test the customer experience with a separate user account.</p><button className="btn-primary mt-5" onClick={()=>signOut({redirectUrl:"/"})}>Sign out and test customer account</button></div>}
      </main>
    </div>
    {productModal&&<ProductModal product={editing} close={()=>{setProductModal(false);setEditing(null)}} save={saveProduct}/>}
  </div>;
}

function AdminOverview({stats,orders,products,busy,setSection}) {
  const cards=[["Revenue",money(stats?.totalRevenue),"Collected order value",CreditCard],["Orders",stats?.totalOrders??"—","All customer orders",ClipboardList],["Products",stats?.totalProducts??products.length,"Products in catalogue",Package],["Customers",stats?.totalUsers??"—","Registered accounts",Users]];
  return <><div className="mb-7 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-extrabold">Good to see you.</h2><p className="mt-1 text-sm text-slate-500">Here's what's happening in your store.</p></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">Admin access verified</span></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([title,value,desc,Icon])=><div key={title} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-500">{title}</span><span className="rounded-xl bg-indigo-50 p-2 text-indigo-600"><Icon size={18}/></span></div><p className="mt-5 font-display text-3xl font-extrabold">{busy?"…":value}</p><p className="mt-1 text-xs text-slate-400">{desc}</p></div>)}</div><div className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]"><div className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-center justify-between"><h3 className="font-extrabold">Recent orders</h3><button onClick={()=>setSection("orders")} className="text-xs font-bold text-indigo-600">View all</button></div><div className="mt-5 space-y-4">{(stats?.recentOrders||orders).slice(0,5).map(o=><div key={o._id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"><div><p className="text-sm font-bold">{o.orderNumber||o._id}</p><p className="text-xs text-slate-400">{o.user?.name||o.user?.email||"Customer"} · {new Date(o.createdAt).toLocaleDateString()}</p></div><div className="text-right"><p className="text-sm font-extrabold">{money(o.totalAmount)}</p><p className="text-xs capitalize text-slate-400">{o.orderStatus}</p></div></div>)}{!orders.length&&<p className="text-sm text-slate-400">No orders found yet.</p>}</div></div><div className="rounded-2xl border border-slate-200 bg-white p-6"><h3 className="font-extrabold">Quick actions</h3><button onClick={()=>setSection("products")} className="mt-5 flex w-full items-center justify-between rounded-xl bg-indigo-50 p-4 text-left text-sm font-bold text-indigo-700">Manage products <ArrowRight size={17}/></button><button onClick={()=>setSection("orders")} className="mt-3 flex w-full items-center justify-between rounded-xl bg-slate-50 p-4 text-left text-sm font-bold text-slate-700">Review orders <ArrowRight size={17}/></button><div className="mt-5 rounded-xl border border-amber-100 bg-amber-50 p-4 text-xs leading-5 text-amber-800">This backend currently exposes admin statistics only. User administration, coupons and analytics exports are not implemented in its API.</div></div></div></>;
}

function ProductTable({products,onEdit,onDelete}) {
  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-4">Product</th><th className="px-5 py-4">Category</th><th className="px-5 py-4">Price</th><th className="px-5 py-4">Stock</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{products.map(p=><tr key={p._id}><td className="px-5 py-4"><div className="flex items-center gap-3"><img src={imageOf(p.images)} className="h-11 w-11 rounded-lg bg-slate-100 object-cover"/><div><p className="font-bold">{p.name}</p><p className="text-xs text-slate-400">{p._id}</p></div></div></td><td className="px-5 py-4 text-slate-500">{p.category}</td><td className="px-5 py-4 font-bold">{money(p.price)}</td><td className="px-5 py-4">{p.stock}</td><td className="px-5 py-4"><span className={cx("rounded-full px-2.5 py-1 text-xs font-bold",p.isActive?"bg-emerald-50 text-emerald-700":"bg-slate-100 text-slate-500")}>{p.isActive?"Active":"Inactive"}</span></td><td className="px-5 py-4"><div className="flex justify-end gap-2"><button onClick={()=>onEdit(p)} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"><Edit3 size={15}/></button><button onClick={()=>onDelete(p._id)} className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50"><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div>{!products.length&&<div className="p-10"><Empty title="No products yet" detail="Add your first product to populate the store."/></div>}</div>;
}

function ProductModal({product,close,save}) {
  const [form,setForm]=useState({name:product?.name||"",description:product?.description||"",price:product?.price??"",category:product?.category||"Other",stock:product?.stock??0,sizes:product?.sizes?.join(", ")||"",isFeatured:!!product?.isFeatured,isActive:product?.isActive!==false});
  const [files,setFiles]=useState([]);const [saving,setSaving]=useState(false);
  const change=e=>setForm({...form,[e.target.name]:e.target.type==="checkbox"?e.target.checked:e.target.value});
  const submit=async e=>{e.preventDefault();setSaving(true);const fd=new FormData();Object.entries(form).forEach(([k,v])=>fd.append(k,k==="sizes"?JSON.stringify(v.split(",").map(s=>s.trim()).filter(Boolean)):String(v)));(product?.images||[]).forEach(img=>fd.append("existingImages",img));files.forEach(f=>fd.append("images",f));await save(fd,product?._id);setSaving(false);};
  return <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-slate-950/50 p-4"><form onSubmit={submit} className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><div><h2 className="text-xl font-extrabold">{product?"Edit product":"Add product"}</h2><p className="mt-1 text-xs text-slate-500">Product details and image uploads.</p></div><button type="button" onClick={close}><X/></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><label className="label">Product name</label><input className="input w-full" name="name" required value={form.name} onChange={change}/></div><div className="sm:col-span-2"><label className="label">Description</label><textarea className="input w-full" rows="3" name="description" required value={form.description} onChange={change}/></div><div><label className="label">Price (₹)</label><input className="input w-full" type="number" min="0" step="0.01" name="price" required value={form.price} onChange={change}/></div><div><label className="label">Stock</label><input className="input w-full" type="number" min="0" name="stock" required value={form.stock} onChange={change}/></div><div><label className="label">Category</label><select className="input w-full" name="category" value={form.category} onChange={change}>{categories.map(c=><option key={c}>{c}</option>)}</select></div><div><label className="label">Sizes (comma separated)</label><input className="input w-full" name="sizes" value={form.sizes} onChange={change} placeholder="S, M, L"/></div><div className="sm:col-span-2"><label className="label">Product images (up to 5 new images)</label><input className="mt-2 block w-full rounded-xl border border-slate-200 p-3 text-sm" type="file" accept="image/*" multiple onChange={e=>setFiles(Array.from(e.target.files||[]).slice(0,5))}/><p className="mt-1 text-xs text-slate-400">{product?"Existing images are retained; selected files are added.":"Select one or more JPG, PNG or WEBP files."}</p></div><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="isFeatured" checked={form.isFeatured} onChange={change}/> Featured product</label><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="isActive" checked={form.isActive} onChange={change}/> Active</label></div><div className="mt-7 flex justify-end gap-3"><button type="button" onClick={close} className="btn-secondary">Cancel</button><button disabled={saving} className="btn-primary">{saving?"Saving...":product?"Save changes":"Create product"}</button></div></form></div>;
}

function OrderTable({orders,updateOrder}) {
  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-4">Order</th><th className="px-5 py-4">Customer</th><th className="px-5 py-4">Date</th><th className="px-5 py-4">Total</th><th className="px-5 py-4">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{orders.map(o=><tr key={o._id}><td className="px-5 py-4 font-bold">{o.orderNumber||o._id}</td><td className="px-5 py-4">{o.user?.name||o.user?.email||"Customer"}</td><td className="px-5 py-4 text-slate-500">{new Date(o.createdAt).toLocaleDateString()}</td><td className="px-5 py-4 font-bold">{money(o.totalAmount)}</td><td className="px-5 py-4"><select value={o.orderStatus} onChange={e=>updateOrder(o,e.target.value)} className="input py-2 capitalize">{statuses.map(s=><option key={s} value={s}>{s}</option>)}</select></td></tr>)}</tbody></table></div>{!orders.length&&<div className="p-10"><Empty title="No orders found" detail="Orders will appear here when customers check out."/></div>}</div>;
}

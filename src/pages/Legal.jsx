import React from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useBusiness } from "../brand";
import { useMeta } from "../meta";
import { Page, cx, usePageTitle } from "../ui";

/* A value from src/config.js, or a clear marker if it has not been filled in yet. */
const V = ({ v, what }) => (v ? <>{v}</> : <mark className="rounded bg-amber-200 px-1 text-amber-950" title="Fill this in brand.json on the server">[add {what} in brand.json]</mark>);
const H = ({ children }) => <h2 className="mt-8 font-display text-lg font-bold first:mt-0">{children}</h2>;
const P = ({ children }) => <p className="mt-2 leading-7 text-slate-700">{children}</p>;
const L = ({ items }) => <ul className="mt-2 list-disc space-y-1.5 pl-5 leading-7 text-slate-700">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>;

const Operator = () => { const B = useBusiness(); return <V v={B.operator} what="the operator name"/>; };

function Terms() {
  const B = useBusiness();
  const meta = useMeta();
  return <>
    <H>1. Who we are</H>
    <P>{B.name} is an online marketplace at {B.domain}, run by <Operator/>. Independent local shops list their products here. We are the platform; every product is sold by the shop named on its page.</P>
    <H>2. Your account</H>
    <P>You sign in with an account (email or phone). Give us correct details, keep your sign-in private, and tell us if you think someone else is using your account. You must be 18 or older, or use the store with a parent or guardian.</P>
    <H>3. Orders</H>
    <L items={[
      "When you place an order you are offering to buy. The order is confirmed when the shop accepts it.",
      "If an order contains items from more than one shop, it is split into separate orders. Each has its own order number, delivery and status.",
      "We or the shop may cancel an order if an item is out of stock, the address is outside our delivery areas, or we cannot reach you. If you already paid, you are refunded in full.",
    ]}/>
    <H>4. Prices and tax</H>
    <P>All prices are in Indian rupees. The price on the product page is what you pay for that item. A delivery fee may be added when you place the order, and the exact total is on your order slip{meta.freeShippingThreshold > 0 ? `; delivery is free on orders of ₹${meta.freeShippingThreshold} or more` : ""}.</P>
    <P>{B.gstRegistered ? <>Prices include GST where it applies. Our GSTIN is <V v={B.gstin} what="the GSTIN"/>.</> : "No GST or other tax is added at checkout. Prices are final."}</P>
    <H>5. Payment</H>
    <L items={[
      "Cash on delivery: pay the delivery partner in cash when the order arrives. It is offered while we have it switched on.",
      "Online payment (UPI, cards, net banking, wallets) is processed by Razorpay when it is available. We never see or store your card details.",
    ]}/>
    <H>6. Reviews</H>
    <P>You can review a product after your order has been delivered. Keep reviews honest and polite. We may remove reviews that are abusive, unrelated, or copied.</P>
    <H>7. Shops and delivery partners</H>
    <P>Shops and delivery partners are approved by us and agree to follow our rules. We may suspend an account that breaks them, delivers badly, or misleads customers.</P>
    <H>8. Our responsibility</H>
    <P>Shops are responsible for the accuracy of their product details and the quality of what they sell. We will help you sort out any problem with an order. Nothing here limits the rights you have under the Consumer Protection Act, 2019 or any other law.</P>
    <H>9. Using the site properly</H>
    <P>Do not misuse the site: no fake orders, no attempts to break or overload it, no collecting other people's data, no posting unlawful content.</P>
    <H>10. Changes and governing law</H>
    <P>We may update these terms and will show the date below. Indian law applies. Disputes go to the courts at <V v={B.jurisdiction} what="your court area"/>, without affecting your right to approach a consumer forum.</P>
  </>;
}

function Privacy() {
  const B = useBusiness();
  return <>
    <P>This explains what personal information {B.name} collects, why, and what you can do about it. It is written to follow India's Digital Personal Data Protection Act, 2023.</P>
    <H>What we collect</H>
    <L items={[
      "Account details: name, email, phone number and profile photo, handled by our sign-in provider Clerk.",
      "Delivery details: addresses, phone numbers, landmarks and order notes you give us.",
      "Orders and payments: what you ordered, from which shop, the amount, the payment method and its status. Card and UPI details stay with the payment provider.",
      "Help requests, reviews, wishlist and notifications.",
      "Delivery partners: vehicle details and, only while they switch sharing on, their live location. Shops: business details and payout account details.",
      "Technical data: IP address, browser type and error logs, used to run and protect the service.",
    ]}/>
    <H>Why we use it</H>
    <L items={["To take, deliver and support your orders.", "To send order updates and important service messages.", "To prevent fraud and misuse.", "To meet legal and accounting duties."]}/>
    <P>We do not sell your personal information, and we do not build advertising profiles. We count how often shop ads are viewed and clicked, without linking that to you.</P>
    <H>Who sees it</H>
    <L items={[
      "The shop that fulfils your order sees your name, phone, delivery address and items.",
      "The delivery partner sees your name, phone, address and any cash to collect.",
      "Service providers that help us run the store: Clerk (sign-in), Razorpay (online payments, when enabled), Cloudflare (network security and delivery of the site), and the provider that stores product images.",
      "Delivery partners' phones use OpenStreetMap services to show maps and routes; an address may be sent to them to find it on the map.",
      "Authorities, when the law requires it.",
    ]}/>
    <H>On your device</H>
    <P>We store small pieces of data in your browser: your sign-in session, your cart while you are signed out, recent searches, recently viewed products, and a copy of the site so it opens quickly and works offline. Clearing your browser data removes them.</P>
    <H>How long we keep it</H>
    <P>We keep your account while it exists. Order records are kept as long as needed to handle disputes, refunds and legal or tax rules, then deleted or anonymised.</P>
    <H>Your rights</H>
    <P>You can ask to see the information we hold about you, correct it, delete your account and data, withdraw consent, or name someone to act for you. Contact us using the details on the <Link className="font-semibold text-brand-700 underline" to="/legal/contact">contact page</Link>. We will answer within 30 days. If we have not solved the matter, you may complain to the Data Protection Board of India.</P>
    <H>Children</H>
    <P>The store is not meant for children under 18 to use alone.</P>
    <H>Security</H>
    <P>The site uses HTTPS, access to systems is limited, and backups are kept. No system is perfectly safe, so tell us straight away if you notice anything wrong.</P>
  </>;
}

function Refunds() {
  const B = useBusiness();
  return <>
    <H>Cancelling an order</H>
    <L items={[
      <>You can cancel from <Link className="font-semibold text-brand-700 underline" to="/orders">My orders</Link> while the order is still <b>Placed</b> (the shop has not started preparing it) and you have not paid online.</>,
      "If you have already paid online, or the order has moved on, contact us from the Help page and we will try to stop it.",
      "Once an order is out for delivery it cannot be cancelled. With cash on delivery you may refuse it at the door; repeated refusals can lead us to switch cash on delivery off for your account.",
      "Online orders that are not paid within a short time are cancelled automatically.",
    ]}/>
    <H>Wrong, damaged or faulty items</H>
    <P>If an item arrives damaged, faulty or is not what you ordered, tell us within <b>{B.returnWindowHours} hours</b> of delivery from the Help page, with clear photos. We check with the shop and either replace the item or refund you.</P>
    <H>Change of mind</H>
    <P>{B.acceptsChangeOfMind ? "Unused items in their original packaging can be returned if you change your mind, within the time shown on the product page." : "We do not accept returns just because you changed your mind, unless the product page says the shop does. Please check the product and the shop before you order."}</P>
    <H>Items we cannot take back</H>
    <L items={["Items that have been used, washed, altered or damaged after delivery.", "Items without their original packaging, accessories or tags.", "Items the product page marks as non-returnable."]}/>
    <H>How refunds are paid</H>
    <L items={[
      <>Paid online: back to the same payment method within <b>{B.refundDays} days</b> of the refund being approved.</>,
      <>Cash on delivery: we pay by UPI or bank transfer to the account you give us, within <b>{B.refundDays} days</b> of approval.</>,
      "Delivery fees are refunded when the problem was ours or the shop's.",
    ]}/>
  </>;
}

function Shipping() {
  const B = useBusiness();
  const meta = useMeta();
  return <>
    <H>Where we deliver</H>
    <P>We deliver in {meta.locations.join(" and ")}. Choose your area when you add an address. Orders for places outside these areas cannot be accepted.</P>
    <H>How</H>
    <P>Orders are delivered by delivery partners from your area, from the shop to your door. Items from different shops arrive as separate deliveries, each with its own tracking on the <Link className="font-semibold text-brand-700 underline" to="/orders">My orders</Link> page.</P>
    <H>How long</H>
    <P>Most orders arrive {B.deliveryEstimate}. It depends on the shop's opening hours, stock and how busy the day is. You will see updates as the order moves from placed to dispatched to delivered.</P>
    <H>Delivery fee</H>
    <P>A delivery fee may be added when you place the order. The exact amount is on your order slip{meta.freeShippingThreshold > 0 ? `, and delivery is free on orders of ₹${meta.freeShippingThreshold} or more` : ""}.</P>
    <H>Cash on delivery</H>
    <P>Keep the exact amount ready if you can. The delivery partner hands over the order only against payment.</P>
    <H>If we cannot reach you</H>
    <P>The delivery partner will call you. If the order cannot be handed over, it goes back to the shop and may be cancelled.</P>
  </>;
}

function Contact() {
  const B = useBusiness();
  const meta = useMeta();
  const g = B.grievanceOfficer;
  const phone = B.phone || meta.supportPhone;
  const email = B.email || meta.supportEmail;
  return <>
    <H>Seller and operator</H>
    <P>{B.name}, run by <Operator/>.</P>
    <L items={[<>Address: <V v={B.address} what="your address"/></>, <>Phone: <V v={phone} what="your phone number"/></>, <>Email: <V v={email} what="your email"/></>, ...(B.whatsapp ? [`WhatsApp: ${B.whatsapp}`] : []), ...(B.gstRegistered ? [<>GSTIN: <V v={B.gstin} what="the GSTIN"/></>] : [])]}/>
    <P>The shop that sells each product is named on the product page.</P>
    <H>Complaints</H>
    <P>For any problem with an order, a product or your data, start with the <Link className="font-semibold text-brand-700 underline" to="/support">Help page</Link>, or write to our grievance officer:</P>
    <L items={[<>Name: <V v={g.name} what="the grievance officer's name"/></>, <>Phone: <V v={g.phone || phone} what="a phone number"/></>, <>Email: <V v={g.email || email} what="an email"/></>, `Available: ${g.hours}`]}/>
    <P>We acknowledge every complaint within {B.complaintAckHours} hours and aim to resolve it within {B.complaintResolveDays} days.</P>
  </>;
}

export const LEGAL = [
  { slug: "terms", title: "Terms of use", Body: Terms },
  { slug: "privacy", title: "Privacy policy", Body: Privacy },
  { slug: "refunds", title: "Returns and refunds", Body: Refunds },
  { slug: "shipping", title: "Delivery policy", Body: Shipping },
  { slug: "contact", title: "Contact and complaints", Body: Contact },
];

export function Legal() {
  const B = useBusiness();
  const { doc } = useParams();
  const current = LEGAL.find((d) => d.slug === doc);
  usePageTitle(current?.title);
  if (!current) return <Navigate to="/legal/terms" replace/>;
  const { Body } = current;
  return <Page className="max-w-5xl">
    <div className="grid gap-8 md:grid-cols-[220px_1fr] md:gap-12">
      <nav aria-label="Policies" className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:block md:space-y-1 md:px-0">
        {LEGAL.map((d) => <Link key={d.slug} to={`/legal/${d.slug}`} aria-current={d.slug === doc ? "page" : undefined} className={cx("block shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium", d.slug === doc ? "bg-ink text-white" : "text-slate-600 hover:bg-slate-200/60")}>{d.title}</Link>)}
      </nav>
      <article>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{current.title}</h1>
        <p className="mt-1 text-sm text-slate-500">Last updated {B.lastUpdated}</p>
        <div className="mt-6"><Body/></div>
      </article>
    </div>
  </Page>;
}

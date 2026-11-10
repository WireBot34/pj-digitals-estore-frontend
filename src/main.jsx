import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
function Root() {
  if (!key || key.includes("replace_me")) {
    return <div className="min-h-screen grid place-items-center bg-slate-950 p-6 text-white"><div className="max-w-lg rounded-2xl border border-white/10 bg-white/5 p-8"><h1 className="text-2xl font-bold">Configure Clerk to start</h1><p className="mt-3 text-slate-300">Copy <code>.env.example</code> to <code>.env</code> and add your Clerk publishable key. Then restart the dev server.</p></div></div>;
  }
  return <ClerkProvider publishableKey={key}><BrowserRouter><App /></BrowserRouter></ClerkProvider>;
}
ReactDOM.createRoot(document.getElementById("root")).render(<React.StrictMode><Root /></React.StrictMode>);
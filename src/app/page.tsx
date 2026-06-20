import { redirect } from "next/navigation";

export default function Home() {
  // proxy.ts redirects unauthenticated users to /login from here.
  redirect("/dashboard");
}

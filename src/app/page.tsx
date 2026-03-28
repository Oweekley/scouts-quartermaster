import { redirect } from "next/navigation";

export default function Home() {
  // Protected routes live under /(app) and will redirect to /login if not signed in.
  // This redirect keeps the root URL tidy.
  redirect("/home");
}

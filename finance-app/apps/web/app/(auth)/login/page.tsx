"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const router = useRouter();

  // redirect: false keeps navigation under our control instead of Auth.js's
  // default page redirect, so a rejected sign-in reliably lands on /denied
  // rather than bouncing back to /login.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await signIn("credentials", { email, redirect: false });
    router.push(result?.error ? "/denied" : "/");
  }

  return (
    <main>
      <h1>Sign in</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
          required
        />
        <button type="submit">Sign in</button>
      </form>
    </main>
  );
}

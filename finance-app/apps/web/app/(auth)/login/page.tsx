"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent } from "react";

import { Guilloche } from "@/components/guilloche";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await signIn("credentials", { identifier, password, redirect: false });

    setIsSubmitting(false);
    if (result?.error) {
      setErrorMessage("Invalid email/username or password.");
      return;
    }
    router.push("/");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <aside className="relative hidden overflow-hidden bg-ink text-paper lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Guilloche className="absolute -right-40 top-1/2 h-[46rem] w-[46rem] -translate-y-1/2 text-ink-line" />
        <p className="relative font-display text-xl font-semibold">Finance App</p>
        <div className="relative max-w-md">
          <h2 className="font-display text-4xl font-semibold leading-tight">
            Know where every peso goes.
          </h2>
          <p className="mt-4 text-ink-muted">
            Group your spending into categories you define: subscriptions, home, travel, fixed costs and
            the small purchases that add up.
          </p>
        </div>
      </aside>

      <main className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <p className="mb-10 font-display text-lg font-semibold lg:hidden">Finance App</p>
          <h1 className="text-3xl font-semibold">Sign in</h1>
          <p className="mt-2 text-sm text-paper-muted">Use your email or username to continue.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <Input
              id="identifier"
              name="identifier"
              label="Email or username"
              type="text"
              autoComplete="username"
              value={identifier}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setIdentifier(event.target.value)}
              required
            />
            <Input
              id="password"
              name="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
              required
            />

            <Button type="submit" disabled={isSubmitting} className="w-full">
              Sign in
            </Button>
          </form>

          {errorMessage ? (
            <p role="alert" className="mt-5 rounded-field bg-clay-tint px-3 py-2.5 text-sm text-clay">
              {errorMessage}
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}

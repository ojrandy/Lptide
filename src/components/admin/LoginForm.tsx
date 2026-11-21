"use client";

import { useActionState } from "react";
import { login, type FormState } from "@/lib/actions/auth";
import { Button, Field, FormMessage, Input } from "./ui";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(login, {});
  return (
    <form action={action} className="grid gap-5">
      <Field label="Email">
        <Input name="email" type="email" autoComplete="username" required maxLength={200} autoFocus placeholder="you@company.com" className="h-10" />
      </Field>
      <Field label="Password">
        <Input name="password" type="password" autoComplete="current-password" required maxLength={200} placeholder="••••••••" className="h-10" />
      </Field>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending} size="lg" className="w-full shadow-sm shadow-navy/30">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

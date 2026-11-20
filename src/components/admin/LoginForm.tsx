"use client";

import { useActionState } from "react";
import { login, type FormState } from "@/lib/actions/auth";
import { Button, Field, FormMessage, Input } from "./ui";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(login, {});
  return (
    <form action={action} className="grid gap-4">
      <Field label="Email">
        <Input name="email" type="email" autoComplete="username" required maxLength={200} autoFocus />
      </Field>
      <Field label="Password">
        <Input name="password" type="password" autoComplete="current-password" required maxLength={200} />
      </Field>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

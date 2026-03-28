"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "./actions";

type LoginState = { ok: true } | { ok: false; error: string };

const initialState: LoginState = { ok: true };

export function LoginForm() {
  const [state, action] = useActionState(loginAction, initialState);

  return (
    <form action={action} className="mt-6 space-y-4">
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state.ok ? null : (
        <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {state.error}
        </div>
      )}
      <Button type="submit" className="w-full">
        Sign in
      </Button>
    </form>
  );
}


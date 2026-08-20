import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Create account · SkillForge" };

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}

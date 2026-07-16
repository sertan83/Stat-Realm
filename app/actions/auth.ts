"use server";

import { redirect } from "next/navigation";
import { signOut } from "@/auth";

export async function signInWithSteam() {
  redirect("/api/auth/steam");
}

export async function logOut() {
  await signOut({ redirectTo: "/" });
}

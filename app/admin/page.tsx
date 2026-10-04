import { redirect } from "next/navigation";

/**
 * /admin is the stable entry point — sign-in and bookmarks point here. The
 * dashboard (A1) isn't built, so for now it forwards to the one screen that is.
 * When A1 lands, this file becomes that page and nothing else changes.
 */
export default function AdminIndex() {
  redirect("/admin/applications");
}
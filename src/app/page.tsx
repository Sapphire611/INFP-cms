import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const cookieStore = await cookies();
  const userInfo = cookieStore.get("user-info");

  // If user is logged in, redirect to dashboard
  if (userInfo?.value) {
    try {
      const user = JSON.parse(userInfo.value);
      if (user?.id) {
        redirect("/cms/dashboard");
      }
    } catch (error) {
      // Invalid cookie, continue to login
    }
  }

  // If not logged in, redirect to login
  redirect("/login");
}

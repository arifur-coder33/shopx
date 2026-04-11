export const dynamic = "force-static";
import { auth } from "@/auth";
import { registrationAction } from "@/backend/serverActions/authActions";
import RegistrationForm from "@/components/auth/RegistrationForm";

export default async function RegisterPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (userId) {
    redirect("/my-account");
  }

  async function signUp(formData) {
    "use server";
    try {
      await registrationAction(formData);
    } catch (error) {
      console.log(error);
    }
  }
  return <RegistrationForm signUp={signUp} />;
}

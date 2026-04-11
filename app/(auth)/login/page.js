export const dynamic = "force-static";
import { auth } from "@/auth";
import LoginForm from "@/components/auth/LoginForm";
export default async function LoginPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (userId) {
    redirect("/my-account");
  }
  return (
    <>
      {/* <div className="w-full mx-auto bg-slate-700 "> */}
      {/* <div className="mx-6 sm:max-w-xs sm:mx-auto flex items-center justify-center h-screen">
          <div className="relative w-full bg-slate-900 p-8 rounded-2xl shadow-xl shadow-purple-500"> */}
      {/* <div className="flex flex-row gap-2 items-center justify-center text-4xl  w-full absolute -top-16  left-0">
              <div className=" h-24 w-24 flex items-center text-center justify-center rounded-full  bg-gray-700 text-purple-500 font-bold border-b-4 border-l-4 border-r-4 border-purple-500 shadow-inner m-2 ring-purple-500">
                <KalapanaFont>লগইন</KalapanaFont>
              </div>
            </div>
            <BackButton /> */}

      <LoginForm />
      {/* <div className="text-[14px] text-blue-500 hover:underline decoration-blue-500 mt-2 text-right">
              পাসওয়ার্ড ভুলে গেছেন?{" "}
              <Link href={"/forgot-password"}>পুনরায় সেট করুন</Link>
            </div>
            <div className="flex justify-between text-[14px]">
              <p className="text-slate-400">একাউন্ট নেই?</p>
              <Link
                href={"/register"}
                className="text-blue-500 hover:underline decoration-blue-500"
              >
                নতুন একাউন্ট খুলুন
              </Link>
            </div> */}
      {/* </div>
        </div> */}
      {/* </div> */}
    </>
  );
}

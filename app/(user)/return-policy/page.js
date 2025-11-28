export const metadata = {
  title: "রিটার্ন ও রিফান্ড পলিসি - bdmart24",
  description:
    "bdmart24-এর সহজ ও স্বচ্ছ রিটার্ন পলিসি। ৩ দিনের মধ্যে রিটার্ন করুন, টাকা ফেরত পান।",
};

export default async function returnPolicyPage() {
  return (
    <>
      <div className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-12 text-center">
            <h1 className="text-3xl md:text-5xl font-bold">
              রিটার্ন ও রিফান্ড পলিসি
            </h1>
            <p className="mt-3 text-lg opacity-90">
              আপনার সন্তুষ্টিই আমাদের প্রথম লক্ষ্য
            </p>
          </div>

          <div className="p-6 md:p-10 text-gray-800 space-y-10">
            {/* Intro */}
            <section className="text-center">
              <p className="text-lg leading-relaxed">
                আমরা চাই আপনি আমাদের প্রোডাক্ট পেয়ে <strong>১০০% খুশি</strong>{" "}
                হন। যদি কোনো কারণে সন্তুষ্ট না হন, তাহলে নিচের শর্তে আমরা
                রিটার্ন গ্রহণ করি।
              </p>
            </section>

            {/* Main Policy Table */}
            <section>
              <h2 className="text-2xl font-bold text-indigo-700 mb-6 text-center">
                রিটার্নের নিয়ম-কানুন
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm md:text-base">
                  <tbody>
                    <tr className="bg-indigo-50">
                      <td className="py-4 px-5 font-semibold">
                        রিটার্নের সময়সীমা
                      </td>
                      <td className="py-4 px-5">
                        প্রোডাক্ট হাতে পাওয়ার ৩ দিনের মধ্যে (৭২ ঘণ্টা)
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 px-5 font-semibold bg-indigo-50">
                        প্রোডাক্টের অবস্থা
                      </td>
                      <td className="py-4 px-5">
                        নতুন, অব্যবহৃত, অরিজিনাল প্যাকেজিং + ট্যাগ সহ, কোনো
                        দাগ/আঁচড় নেই
                      </td>
                    </tr>
                    <tr className="bg-indigo-50">
                      <td className="py-4 px-5 font-semibold">
                        রিটার্ন করা যাবে না
                      </td>
                      <td className="py-4 px-5">
                        অন্তর্বাস, সুইমওয়্যার, ইয়ারফোন, সকেট, পার্সোনাল
                        কেয়ার, খাবার, কাস্টমাইজড প্রোডাক্ট
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 px-5 font-semibold bg-indigo-50">
                        রিটার্নের কারণ
                      </td>
                      <td className="py-4 px-5">
                        ১. প্রোডাক্ট নষ্ট/ত্রুটিপূর্ণ
                        <br />
                        ২. ভুল প্রোডাক্ট পাঠানো হয়েছে
                        <br />
                        ৩. সাইজ/কালার মিলেনি (শুধু পোশাকের ক্ষেত্রে)
                      </td>
                    </tr>
                    <tr className="bg-indigo-50">
                      <td className="py-4 px-5 font-semibold">রিফান্ড পাবেন</td>
                      <td className="py-4 px-5">
                        রিটার্ন গ্রহণের ৩-৭ কর্মদিবসের মধ্যে (বিকাশ/নগদ/ব্যাংক)
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 px-5 font-semibold bg-indigo-50">
                        কুরিয়ার খরচ
                      </td>
                      <td className="py-4 px-5">
                        আমাদের ভুল হলে →{" "}
                        <strong className="text-green-600">আমরা দিব</strong>
                        <br />
                        আপনার কারণে হলে → আপনাকে দিতে হবে
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* How to Return */}
            <section className="bg-gradient-to-r from-indigo-100 to-blue-50 rounded-xl p-8">
              <h2 className="text-2xl font-bold text-indigo-700 mb-6 text-center">
                রিটার্ন করবেন কীভাবে?
              </h2>
              <ol className="space-y-4 text-lg">
                <li className="flex items-start gap-3">
                  <span className="font-bold text-indigo-700">১.</span>
                  <span>
                    ফেসবুক পেজে ইনবক্স করুন অথবা হোয়াটসঅ্যাপ/কল করুন:{" "}
                    <strong>01915-109159</strong>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-bold text-indigo-700">২.</span>
                  <span>প্রোডাক্টের ছবি + অর্ডার নম্বর পাঠান</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-bold text-indigo-700">৩.</span>
                  <span>
                    আমরা আপনাকে রিটার্ন কুরিয়ারের ঠিকানা ও নিয়ম জানিয়ে দিব
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-bold text-indigo-700">৪.</span>
                  <span>
                    প্রোডাক্ট পৌঁছানোর পর ৩-৭ দিনের মধ্যে টাকা ফেরত পাবেন
                  </span>
                </li>
              </ol>
            </section>

            {/* Footer */}
            <section className="text-center py-8">
              <p className="text-xl font-semibold text-indigo-700">
                ধন্যবাদ আপনার বিশ্বাসের জন্য ❤️
              </p>
              <p className="mt-2 text-gray-600">— bdmart24 টিম</p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

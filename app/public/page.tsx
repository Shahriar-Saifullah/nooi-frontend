"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <>
      {/* Hero Banner */}
      <div className="w-full bg-white h-20 flex items-center justify-end gap-3 pr-6">
        <Link
          href="/authpage/signin"
          className="text-teal-600 hover:text-teal-700 font-semibold py-2 px-4"
        >
          Sign in
        </Link>
        <Link
          href="/authpage/signup"
          className="bg-teal-700 hover:bg-teal-800 text-white font-semibold py-2 px-6 rounded-lg"
        >
          Sign up
        </Link>
      </div>

      {/* Our Product Features */}
      <section className="py-20 px-4 text-center">
        <h2 className="text-4xl font-bold text-gray-900 mb-3">
          Our Product Features
        </h2>
        <p className="max-w-xl mx-auto text-gray-500 text-base leading-relaxed">
          From sketch to furniture delivery, Nooi&apos;s AI tools help you
          design, visualize, and build dream spaces—effortlessly turning ideas
          into reality with simplicity.
        </p>

        {/* Feature cards placeholder */}
        <div className="mt-12 max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
          {["2D / 3D Visuals", "Floor Planning", "Furniture Delivery"].map(
            (title) => (
              <div
                key={title}
                className="rounded-2xl bg-gray-50 border border-gray-100 h-64 flex items-end p-5"
              >
                <span className="text-sm font-semibold text-gray-700">
                  {title}
                </span>
              </div>
            ),
          )}
        </div>
      </section>
    </>
  );
}

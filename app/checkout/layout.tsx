import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Secure Checkout | Nooi',
  description: 'Complete your luxury interior order with end-to-end encrypted Stripe checkout.',
};

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#272e35] selection:bg-[#004643] selection:text-white">
      {children}
    </div>
  );
}

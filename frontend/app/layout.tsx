import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  title: 'Dhaka Tesla Pool – Share a Seat. Split the Fare. Survive Dhaka Traffic.',
  description: 'Dhaka\'s ride-pooling platform. Share a Tesla with neighbours, split the fare, and beat the rush hour together.',
  keywords: 'Dhaka, ride pool, Tesla, carpooling, Bangladesh, fare split',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

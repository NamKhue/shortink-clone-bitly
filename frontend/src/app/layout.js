import Link from "next/link";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import "./globals.css";

import ErrorBoundary from "@components/ErrorBoundary";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          <nav className="bg-green-800 p-4">
            <Link href="/" className="text-white text-lg font-bold">
              Shortink
            </Link>
          </nav>

          {children}

          <ToastContainer position="top-right" autoClose={3000} />
        </ErrorBoundary>
      </body>
    </html>
  );
}

import ShortenForm from "@components/ShortenForm";
import ErrorBoundary from "@components/ErrorBoundary";

export default function Home() {
  return (
    <div className="max-w-xl mx-auto p-4">
      <ErrorBoundary>
        <ShortenForm />
      </ErrorBoundary>
    </div>
  );
}

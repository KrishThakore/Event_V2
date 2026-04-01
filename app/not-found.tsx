import Link from "next/link";
import NotFoundReporter from "@/components/NotFoundReporter";

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <NotFoundReporter />
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-gray-600">
        The URL you opened doesn&apos;t exist in this deployment.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded bg-black px-4 py-2 text-sm font-medium text-white"
      >
        Go home
      </Link>
    </div>
  );
}


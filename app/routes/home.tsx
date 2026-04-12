import type { Route } from "./+types/home";
export function meta({}: Route.MetaArgs) {
  return [
    { title: "Mat Finder" },
    { name: "description", content: "Welcome to Mat Finder!" },
  ];
}

export default function Home() {
  return (
    <main className="flex items-center justify-center pt-16 pb-4">
      <div className="flex-1 flex flex-col items-center gap-16 min-h-0">
        <header className="flex flex-col items-center gap-9">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-100">
            Mat Finder
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Welcome to Mat Finder
          </p>
        </header>
      </div>
    </main>
  );
}

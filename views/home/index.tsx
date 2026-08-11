import { Header } from "@/components/header";

export default function HomeView() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Header />

      <main className="flex flex-1 flex-col px-4 pt-4">
        <p className="text-secondary">Home</p>
      </main>
    </div>
  );
}

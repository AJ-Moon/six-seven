import { Link } from "react-router-dom";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pb-24 md:pb-0">
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <div className="mb-6 flex items-center justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <UtensilsCrossed className="h-10 w-10 text-muted-foreground" />
            </div>
          </div>
          <p className="font-mono text-sm font-semibold text-muted-foreground">
            404
          </p>
          <h1 className="mt-2 font-serif text-3xl font-bold text-foreground">
            Page not found
          </h1>
          <p className="mt-3 text-muted-foreground">
            The page you're looking for doesn't exist or may have moved.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg">
              <Link to="/menu">Browse the menu</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

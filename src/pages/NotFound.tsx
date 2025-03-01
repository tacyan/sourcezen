
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="glass-panel p-8 text-center animate-fade-in max-w-lg">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-6">
          ページが見つかりませんでした
        </p>
        <Link to="/">
          <Button className="inline-flex items-center transitions-all">
            <ChevronLeft size={16} className="mr-2" />
            ホームに戻る
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;

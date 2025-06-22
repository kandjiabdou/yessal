
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import NavBar from "@/components/NavBar";
import PageHeader from "@/components/PageHeader";
import { useLocation } from "react-router-dom";

const WebView = () => {
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const section = queryParams.get('section');

  // Base URL for the website
  const baseUrl = "https://yessal.sn";
  
  // Construct the full URL with section if provided
  const websiteUrl = section ? `${baseUrl}/#${section}` : baseUrl;

  useEffect(() => {
    // If iframe is loaded and we have a section, send a message to scroll to that section
    if (!loading && section) {
      const iframe = document.querySelector('iframe');
      if (iframe) {
        try {
          // This assumes the website has code to handle this message
          iframe.contentWindow?.postMessage({ action: 'scrollToSection', section }, baseUrl);
        } catch (error) {
          console.error("Error sending message to iframe:", error);
        }
      }
    }
  }, [loading, section]);

  return (
    <div className="container max-w-md mx-auto pb-20 flex flex-col min-h-screen">
      <div className="p-4">
        <PageHeader
          title={section === 'tarifs' ? "Tarifs" : "Site web Yessal"}
          showBackButton
        />
      </div>

      <div className="flex-1 flex flex-col">
        {loading && (
          <div className="flex flex-col items-center justify-center p-10 flex-1">
            <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin mb-4"></div>
            <p className="text-muted-foreground">Chargement du site...</p>
          </div>
        )}

        <iframe
          src={websiteUrl}
          className={`w-full flex-1 ${loading ? "hidden" : "block"}`}
          onLoad={() => setLoading(false)}
          title="Site web Yessal"
        ></iframe>

        {!loading && (
          <div className="p-4 bg-background border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open(websiteUrl, "_blank")}
            >
              Ouvrir dans le navigateur
            </Button>
          </div>
        )}
      </div>

      <NavBar />
    </div>
  );
};

export default WebView;

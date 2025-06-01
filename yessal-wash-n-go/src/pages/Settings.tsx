
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import NavBar from "@/components/NavBar";
import PageHeader from "@/components/PageHeader";

const Settings = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState({
    push: true,
    email: true,
    sms: false,
  });
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState("fr");

  const handleSave = () => {
    toast({
      title: "Paramètres mis à jour",
      description: "Vos préférences ont été enregistrées avec succès.",
    });
    navigate("/profile");
  };

  return (
    <div className="container max-w-md mx-auto pb-20">
      <div className="p-4">
        <PageHeader
          title="Paramètres"
          action={{ label: "Enregistrer", onClick: handleSave }}
        />

        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="push-notifications">Notifications push</Label>
              <Switch
                id="push-notifications"
                checked={notifications.push}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, push: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="email-notifications">Notifications email</Label>
              <Switch
                id="email-notifications"
                checked={notifications.email}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, email: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sms-notifications">Notifications SMS</Label>
              <Switch
                id="sms-notifications"
                checked={notifications.sms}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, sms: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Apparence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="dark-mode">Mode sombre</Label>
              <Switch
                id="dark-mode"
                checked={darkMode}
                onCheckedChange={setDarkMode}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Langue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between gap-2">
              <Button
                variant={language === "fr" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setLanguage("fr")}
              >
                Français
              </Button>
              <Button
                variant={language === "en" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setLanguage("en")}
              >
                English
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Confidentialité</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full text-left justify-start">
              Conditions générales d'utilisation
            </Button>
            <Button variant="outline" className="w-full text-left justify-start">
              Politique de confidentialité
            </Button>
            <Separator />
            <Button variant="destructive" className="w-full">
              Supprimer mon compte
            </Button>
          </CardContent>
        </Card>
      </div>

      <NavBar />
    </div>
  );
};

export default Settings;

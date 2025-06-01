
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { Apple, Mail, Phone } from "lucide-react";
import { mockUsers } from "@/lib/mockData";

const AuthForm = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    
    // Check if the email is one of our test profiles
    const isTestProfile = Object.keys(mockUsers).includes(email);
    
    if (isTestProfile) {
      // Save the email to localStorage to retrieve the user later
      localStorage.setItem('userEmail', email);
      
      // Show a toast with the user type
      const userType = [];
      if (mockUsers[email].subscription === 'premium') userType.push('Premium');
      if (mockUsers[email].isStudent) userType.push('Étudiant');
      
      const userTypeText = userType.length > 0 
        ? `(${userType.join(' + ')})` 
        : '(Standard)';
      
      setTimeout(() => {
        setIsLoading(false);
        toast({
          title: "Connexion réussie",
          description: `Bienvenue chez Yessal ${userTypeText}`,
        });
        navigate("/dashboard");
      }, 1500);
    } else {
      // Regular authentication flow for non-test profiles
      setTimeout(() => {
        setIsLoading(false);
        // Clear any previous test profile
        localStorage.removeItem('userEmail');
        toast({
          title: "Connexion réussie",
          description: "Bienvenue chez Yessal",
        });
        navigate("/dashboard");
      }, 1500);
    }
  };

  const handleSocialAuth = (provider: string) => {
    setIsLoading(true);
    
    // Clear any previous test profile
    localStorage.removeItem('userEmail');
    
    // Simulate authentication
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Connexion réussie",
        description: `Connecté avec ${provider}`,
      });
      navigate("/dashboard");
    }, 1500);
  };

  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden">
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="text-xl sm:text-2xl text-center">Se connecter</CardTitle>
        <CardDescription className="text-center text-xs sm:text-sm">
          Connectez-vous pour accéder à votre compte
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6">
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Connexion</TabsTrigger>
            <TabsTrigger value="register">Inscription</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <form onSubmit={handleSubmit}>
              <div className="space-y-3 sm:space-y-4">
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="exemple@email.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                  />
                  {Object.keys(mockUsers).includes(email) && (
                    <div className="mt-1 text-xs text-primary">
                      <p>
                        Profil de test{' '}
                        {mockUsers[email].subscription === 'premium' && '★ Premium '}
                        {mockUsers[email].isStudent && '🎓 Étudiant'}
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Mot de passe</Label>
                    <a href="#" className="text-xs sm:text-sm text-primary hover:underline">
                      Mot de passe oublié?
                    </a>
                  </div>
                  <Input 
                    id="password" 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                  />
                </div>
                <Button type="submit" className="w-full text-sm" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Connexion en cours...
                    </>
                  ) : (
                    "Se connecter"
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>
          <TabsContent value="register">
            <form onSubmit={handleSubmit}>
              <div className="space-y-3 sm:space-y-4">
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="register-name">Nom complet</Label>
                  <Input id="register-name" placeholder="Amadou Diop" required />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <Input id="register-email" type="email" placeholder="exemple@email.com" required />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="register-phone">Téléphone</Label>
                  <Input id="register-phone" type="tel" placeholder="+221 XX XXX XX XX" required />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="register-password">Mot de passe</Label>
                  <Input id="register-password" type="password" required />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="register-confirm">Confirmez le mot de passe</Label>
                  <Input id="register-confirm" type="password" required />
                </div>
                <Button type="submit" className="w-full text-sm" disabled={isLoading}>
                  {isLoading ? "Création du compte..." : "Créer un compte"}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Ou continuer avec
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button 
            variant="outline" 
            className="w-full text-xs sm:text-sm h-9"
            onClick={() => handleSocialAuth("Google")}
            disabled={isLoading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" className="mr-2">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuer avec Google
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full text-xs sm:text-sm h-9"
            onClick={() => handleSocialAuth("Microsoft")}
            disabled={isLoading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 23 23" className="mr-2">
              <rect x="1" y="1" width="10" height="10" fill="#f25022"/>
              <rect x="1" y="12" width="10" height="10" fill="#00a4ef"/>
              <rect x="12" y="1" width="10" height="10" fill="#7fba00"/>
              <rect x="12" y="12" width="10" height="10" fill="#ffb900"/>
            </svg>
            Microsoft
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full text-xs sm:text-sm h-9"
            onClick={() => handleSocialAuth("Apple")}
            disabled={isLoading}
          >
            <Apple className="mr-2" size={20} />
            Apple
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full text-xs sm:text-sm h-9"
            onClick={() => handleSocialAuth("Téléphone")}
            disabled={isLoading}
          >
            <Phone className="mr-2" size={20} />
            Téléphone
          </Button>
        </div>

        <div className="border border-border rounded-lg p-3 mt-4 bg-muted/30">
          <h3 className="font-medium mb-2">Comptes de test</h3>
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>premium@yessal.sn</strong> - Utilisateur Premium</p>
            <p><strong>etudiant@yessal.sn</strong> - Utilisateur Étudiant</p>
            <p><strong>normale@yessal.sn</strong> - Utilisateur Standard</p>
            <p><strong>premium-etudiant@yessal.sn</strong> - Utilisateur Premium + Étudiant</p>
            <p className="mt-2 italic">Tout mot de passe est accepté pour ces comptes</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AuthForm;

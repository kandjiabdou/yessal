import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
const Login: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate login process
    setTimeout(() => {
      setIsLoading(false);
      toast.success("Connexion réussie!");
      navigate('/dashboard');
    }, 1000);
  };
  return <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center bg-primary-DEFAULT">
          <div className="flex justify-center mb-4">
            <img alt="Yessal Logo" className="h-16 w-auto" src="/lovable-uploads/41d52430-5cd6-4c8b-a991-dfe0a0b84c18.png" />
          </div>
          <h1 className="text-3xl font-bold text-primary-DEFAULT">Yessal Manager</h1>
          <p className="text-gray-500 mt-2">Gestionnaire de laverie Yessal</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Connexion</CardTitle>
          </CardHeader>
          
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="identifier" className="text-sm font-medium">
                  Email ou numéro de téléphone
                </label>
                <Input id="identifier" type="text" placeholder="manager@yessal.sn ou 77 123 45 67" value={identifier} onChange={e => setIdentifier(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Mot de passe
                </label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
                {isLoading ? "Connexion en cours..." : "Se connecter"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>;
};
export default Login;

import AuthForm from "@/components/AuthForm";

const Auth = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/30 to-background flex flex-col justify-center p-3 sm:p-6">
      <div className="w-full max-w-md mx-auto mb-6 sm:mb-10 text-center">
        <div className="bg-white inline-block rounded-full p-3 mb-3">
          <img 
            src="/lovable-uploads/e617cd09-812a-489b-961c-ebe53c2de5be.png" 
            alt="Yessal Logo" 
            className="w-14 h-14 object-contain" 
          />
        </div>
        <h1 className="text-3xl font-bold">Yessal</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
          Bienvenue sur l'application mobile des laveries automatiques Yessal
        </p>
      </div>
      
      <AuthForm />
      
      <div className="mt-6 sm:mt-8 text-center">
        <p className="text-xs sm:text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Yessal - Tous droits réservés
        </p>
        <p className="text-xs mt-1 text-muted-foreground">
          <a href="https://yessal.sn" className="hover:underline">yessal.sn</a>
        </p>
      </div>
    </div>
  );
};

export default Auth;

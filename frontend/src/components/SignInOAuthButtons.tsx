import * as React from "react";
import { useSignIn } from "@clerk/clerk-react";
import { Button } from "./ui/button";

const SignInOAuthButtons = () => {
  const { signIn, isLoaded } = useSignIn();

  const signInWithGoogle = async () => {
    if (!isLoaded) {
      console.log("Clerk is not loaded yet");
      return;
    }
    
    console.log("Attempting Google sign in...");
    
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/auth-callback",
      });
      console.log("Sign in redirect initiated");
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  return (
    <div className="flex flex-col space-y-2">
      <Button 
        variant="outline" 
        className="w-full flex items-center gap-2 bg-transparent border-zinc-700 hover:bg-zinc-800"
        onClick={signInWithGoogle}
        disabled={!isLoaded}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4">
          <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032
            s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2
            C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" 
            fill="#FFF" />
        </svg>
        <span>Sign in with Google</span>
      </Button>
    </div>
  );
};

export default SignInOAuthButtons; 
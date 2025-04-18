import * as React from "react";
import { useSignIn } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "lucide-react";

export default function SignInOAuthButtons() {
  const { signIn, isLoaded } = useSignIn();

  if (!isLoaded) {
    return null;
  }

  const signInWithGithub = async () => {
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_github",
        redirectUrl: "/auth-callback",
        redirectUrlComplete: "/",
      });
    } catch (error) {
      console.error("Error signing in with GitHub:", error);
    }
  };

  const signInWithGoogle = async () => {
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/auth-callback",
        redirectUrlComplete: "/",
      });
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <Button
        type="button"
        variant="outline"
        className="w-full flex items-center gap-2"
        onClick={signInWithGoogle}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15.545 6.558a9.42 9.42 0 0 1 .139 1.626c0 2.434-.87 4.492-2.384 5.885h.002C11.978 15.292 10.158 16 8 16A8 8 0 1 1 8 0a7.689 7.689 0 0 1 5.352 2.082l-2.284 2.284A4.347 4.347 0 0 0 8 3.166c-2.087 0-3.86 1.408-4.492 3.304a4.792 4.792 0 0 0 0 3.063h.003c.635 1.893 2.405 3.301 4.492 3.301 1.078 0 2.004-.276 2.722-.764h-.003a3.702 3.702 0 0 0 1.599-2.431H8v-3.08h7.545z" fill="currentColor"/>
        </svg>
        Continue with Google
      </Button>

      <Button
        type="button"
        variant="outline"
        className="w-full flex items-center gap-2"
        onClick={signInWithGithub}
      >
        <GithubIcon className="w-4 h-4" />
        Continue with GitHub
      </Button>
    </div>
  );
} 
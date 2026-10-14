import { createFileRoute, Link } from "@tanstack/react-router";

import { signOut } from "@/account";
import { Button, Text } from "@/design-system";

export const Route = createFileRoute("/_signedIn/_hasAccount/")({
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen p-xl">
      <Text variant="heading" className="mb-xs">
        Birdie &amp; Claire
      </Text>
      <p className="text-secondary text-body mb-md">
        The API is at <code className="text-primary">/api/v1</code>. Docs are at{" "}
        <a className="underline hover:text-primary" href="http://localhost:8080/docs">
          localhost:8080/docs
        </a>
        .
      </p>
      <Link className="block underline hover:text-primary text-body" to="/profile-picture-test">
        Profile picture test →
      </Link>
      <Link className="block underline hover:text-primary text-body" to="/outfits">
        Outfits →
      </Link>
      <Link className="block underline hover:text-primary text-body" to="/create-outfit">
        Create an outfit →
      </Link>
      <Link className="block underline hover:text-primary text-body" to="/llm-test">
        LLM test →
      </Link>
      <div className="mt-lg">
        <Button label="Sign out" onClick={signOut} />
      </div>
    </div>
  );
}

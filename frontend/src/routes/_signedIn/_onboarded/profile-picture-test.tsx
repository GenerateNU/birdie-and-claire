import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState, type ChangeEvent } from "react";

import { apiFetch } from "@/api";
import { Avatar, Button, Text } from "@/design-system";
import { supabase } from "@/supabase/client";

export const Route = createFileRoute("/_signedIn/_onboarded/profile-picture-test")({
  component: ProfilePictureTest,
});

// Must match the backend allow-list. HEIC (iPhone default) is excluded because
// most browsers can't render it in an <img>.
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface UserResponse {
  id: string;
  name: string;
  profile_picture_url: string | null;
}

interface PresignedUpload {
  url: string;
  method: string;
  headers: Record<string, string>;
  key: string;
}

function ProfilePictureTest() {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function fetchCurrentUser() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error("not signed in");
    }

    const res = await apiFetch(`/api/v1/users/${session.user.id}`);

    if (!res.ok) {
      throw new Error(`GET user failed: ${res.status}`);
    }

    // SAFETY: a 2xx from GET /api/v1/users/{id} is the UserResponse schema in openapi.yaml.
    setUser((await res.json()) as UserResponse);
  }

  async function upload(file: File) {
    // 1. ask the backend for a short-lived upload URL
    const presignRes = await apiFetch(
      `/api/v1/users/me/profile-picture/upload?content_type=${encodeURIComponent(file.type)}`,
    );

    if (!presignRes.ok) {
      throw new Error(`presign failed: ${presignRes.status}`);
    }

    // SAFETY: a 2xx from the upload-URL route is the ProfilePictureUploadResponse schema in openapi.yaml.
    const presigned = (await presignRes.json()) as PresignedUpload;

    // 2. PUT the bytes straight to storage, replaying the signed headers. Plain
    // fetch: the Supabase token must not go to the storage provider.
    const putRes = await fetch(presigned.url, {
      method: presigned.method,
      headers: presigned.headers,
      body: file,
    });

    if (!putRes.ok) {
      throw new Error(`storage upload failed: ${putRes.status}`);
    }

    // 3. confirm the specific upload so the backend verifies it and points the
    // profile at it
    const confirmRes = await apiFetch(`/api/v1/users/me/profile-picture/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: presigned.key }),
    });

    if (!confirmRes.ok) {
      throw new Error(`confirm failed: ${confirmRes.status}`);
    }
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setStatus(null);
      setError(`Unsupported format${file.type ? ` (${file.type})` : ""} — use JPEG, PNG, or WebP.`);

      return;
    }

    setError(null);
    setStatus("Uploading...");

    try {
      await upload(file);
      await fetchCurrentUser();
      setStatus("Done");
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="min-h-screen p-xl">
      <Link className="text-secondary text-body underline hover:text-primary" to="/">
        ← Home
      </Link>
      <Text variant="heading" className="mt-md mb-xs">
        Profile picture test
      </Text>
      <p className="text-secondary text-body mb-xl">
        Sign in first, then pick an image and it uploads via a presigned URL.
      </p>

      <div className="flex flex-col gap-md max-w-content-sm">
        {/* The native file input can't be restyled, so it stays hidden and the
            Button opens its file picker. */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          onChange={handleFile}
          className="hidden"
        />
        <Button
          label="Choose file"
          onClick={() => fileInputRef.current?.click()}
          className="self-start"
        />

        {status && <p className="text-secondary text-body">{status}</p>}
        {error && <p className="text-error text-body">Error: {error}</p>}

        {user && (
          <div className="bg-surface rounded-lg p-md border">
            <p className="font-semibold">{user.name || "(no name)"}</p>
            <p className="text-secondary text-caption break-all">{user.id}</p>
            {user.profile_picture_url ? (
              <div className="mt-sm">
                <Avatar src={user.profile_picture_url} alt="profile" size="lg" />
              </div>
            ) : (
              <p className="text-secondary text-body mt-sm">No profile picture</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

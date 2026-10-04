import { useState, type ChangeEvent } from "react";

import { apiFetch } from "./api";
import { supabase } from "./supabase/client";

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

export default function ProfilePictureTest() {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserResponse | null>(null);

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
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <a className="text-gray-400 text-sm underline hover:text-white" href="/">
        ← Home
      </a>
      <h1 className="text-3xl font-bold mt-4 mb-2">Profile picture test</h1>
      <p className="text-gray-400 text-sm mb-8">
        Sign in first, then pick an image and it uploads via a presigned URL.
      </p>

      <div className="flex flex-col gap-4 max-w-md">
        <label className="flex flex-col gap-1 text-sm">
          Image
          <input
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            onChange={handleFile}
            className="text-sm file:mr-3 file:rounded file:border-0 file:bg-blue-500 file:px-3 file:py-2 file:text-white"
          />
        </label>

        {status && <p className="text-gray-400 text-sm">{status}</p>}
        {error && <p className="text-red-400 text-sm">Error: {error}</p>}

        {user && (
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="font-semibold">{user.name || "(no name)"}</p>
            <p className="text-gray-400 text-xs break-all">{user.id}</p>
            {user.profile_picture_url ? (
              <img
                src={user.profile_picture_url}
                alt="profile"
                className="mt-3 h-32 w-32 rounded-full object-cover"
              />
            ) : (
              <p className="text-gray-500 text-sm mt-3">No profile picture</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

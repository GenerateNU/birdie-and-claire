import { useState, type ChangeEvent } from "react";

interface UserView {
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

export default function AvatarTest() {
  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserView | null>(null);

  async function fetchUser(id: string) {
    const res = await fetch(`/api/v1/users/${id}`);
    if (!res.ok) {
      throw new Error(`GET user failed: ${res.status}`);
    }
    setUser((await res.json()) as UserView);
  }

  async function upload(id: string, file: File) {
    // 1. ask the backend for a short-lived upload URL
    const presignRes = await fetch(
      `/api/v1/users/${id}/avatar-upload-url?content_type=${encodeURIComponent(file.type)}`,
    );
    if (!presignRes.ok) {
      throw new Error(`presign failed: ${presignRes.status}`);
    }
    const upload = (await presignRes.json()) as PresignedUpload;

    // 2. PUT the bytes straight to storage, replaying the signed headers
    const putRes = await fetch(upload.url, {
      method: upload.method,
      headers: upload.headers,
      body: file,
    });
    if (!putRes.ok) {
      throw new Error(`storage upload failed: ${putRes.status}`);
    }

    // 3. confirm so the backend verifies and records the object
    const confirmRes = await fetch(`/api/v1/users/${id}/avatar/confirm`, { method: "POST" });
    if (!confirmRes.ok) {
      throw new Error(`confirm failed: ${confirmRes.status}`);
    }
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) {
      return;
    }

    setError(null);
    setStatus("Uploading...");

    try {
      await upload(userId, file);
      await fetchUser(userId);
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
        Enter a user ID, pick an image, and it uploads via a presigned URL.
      </p>

      <div className="flex flex-col gap-4 max-w-md">
        <label className="flex flex-col gap-1 text-sm">
          User ID
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="123e4567-e89b-12d3-a456-426614174000"
            className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Image
          <input
            type="file"
            accept="image/*"
            disabled={!userId}
            onChange={handleFile}
            className="text-sm file:mr-3 file:rounded file:border-0 file:bg-blue-500 file:px-3 file:py-2 file:text-white disabled:opacity-50"
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

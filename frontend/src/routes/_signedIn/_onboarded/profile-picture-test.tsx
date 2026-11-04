import { CaretLeft } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, type ChangeEvent } from "react";

import {
  getCurrentUserOptions,
  getCurrentUserQueryKey,
} from "@/api/generated/@tanstack/react-query.gen";
import {
  confirmUserProfilePicture,
  createUserProfilePictureUploadUrl,
} from "@/api/generated/sdk.gen";
import { zCreateUserProfilePictureUploadUrlQuery } from "@/api/generated/zod.gen";
import { Avatar, Box, Button, Link, Page, Text } from "@/design-system";

export const Route = createFileRoute("/_signedIn/_onboarded/profile-picture-test")({
  component: ProfilePictureTest,
});

// The backend's allow-list. HEIC (iPhone default) isn't on it because most browsers can't render
// it in an <img>.
const contentTypeSchema = zCreateUserProfilePictureUploadUrlQuery.shape.content_type;

async function upload(file: File) {
  const contentType = contentTypeSchema.parse(file.type);

  const { data: presigned } = await createUserProfilePictureUploadUrl({
    query: { content_type: contentType },
    throwOnError: true,
  });

  // Plain fetch, not the generated client: the Supabase token must not go to the storage provider.
  const putRes = await fetch(presigned.url, {
    method: presigned.method,
    headers: presigned.headers,
    body: file,
  });

  if (!putRes.ok) {
    throw new Error(`storage upload failed: ${putRes.status}`);
  }

  await confirmUserProfilePicture({ body: { key: presigned.key }, throwOnError: true });
}

function ProfilePictureTest() {
  const queryClient = useQueryClient();
  const [formatError, setFormatError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userQuery = useQuery(getCurrentUserOptions());

  const uploadMutation = useMutation({
    mutationFn: upload,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getCurrentUserQueryKey() }),
  });

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    if (!contentTypeSchema.safeParse(file.type).success) {
      uploadMutation.reset();
      setFormatError(
        `Unsupported format${file.type ? ` (${file.type})` : ""} — use JPEG, PNG, or WebP.`,
      );

      return;
    }

    setFormatError(null);
    uploadMutation.mutate(file);
  }

  const error = formatError ?? (uploadMutation.isError ? "Upload failed. Try again." : null);
  const user = userQuery.data;

  return (
    <Page>
      <Link variant="text" to="/dev" leadingIcon={CaretLeft}>
        Dev
      </Link>
      <Text variant="heading" className="mt-md mb-xs">
        Profile picture test
      </Text>
      <Text variant="body" className="mb-xl text-secondary">
        Pick an image and it uploads via a presigned URL.
      </Text>

      <Box className="flex max-w-content-sm flex-col gap-md">
        {/* The native file input can't be restyled, so it stays hidden and the
            Button opens its file picker. */}
        <input
          ref={fileInputRef}
          type="file"
          accept={contentTypeSchema.options.join(",")}
          onChange={handleFile}
          className="hidden"
        />
        <Button
          label="Choose file"
          onClick={() => fileInputRef.current?.click()}
          className="self-start"
        />

        {uploadMutation.isPending && (
          <Text variant="body" className="text-secondary">
            Uploading...
          </Text>
        )}
        {uploadMutation.isSuccess && (
          <Text variant="body" className="text-secondary">
            Done
          </Text>
        )}
        {error && (
          <Text variant="body" className="text-error">
            {error}
          </Text>
        )}

        {user && (
          <Box className="rounded-lg border bg-surface p-md">
            <Text variant="body" className="font-semibold">
              {user.name || "(no name)"}
            </Text>
            <Text variant="caption" className="block break-all text-secondary">
              {user.id}
            </Text>
            {user.profile_picture_url ? (
              <Box className="mt-sm">
                <Avatar src={user.profile_picture_url} alt="profile" size="lg" />
              </Box>
            ) : (
              <Text variant="body" className="mt-sm text-secondary">
                No profile picture
              </Text>
            )}
          </Box>
        )}
      </Box>
    </Page>
  );
}

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { fetchCurrentUser } from "@/account";
import { Box, Button, ErrorState, ImageCard, Spinner, Text } from "@/design-system";
import {
  fitFields,
  questions,
  saveStylePreferences,
  togglePreference,
  type PreferenceField,
  type StylePreferences,
} from "@/style-preferences";

export const Route = createFileRoute("/_signedIn/_onboarded/profile/settings/style-preferences")({
  component: StylePreferencesPage,
});

const stylePreferencesKey = ["style-preferences"];

async function fetchSavedPreferences(signal: AbortSignal): Promise<StylePreferences> {
  const user = await fetchCurrentUser(signal);

  // The route guard sends users without preferences to onboarding, so this only happens if the
  // row changed after the account status was cached.
  if (user?.style_preferences === undefined) {
    throw new Error("no style preferences are saved yet");
  }

  return user.style_preferences;
}

function StylePreferencesPage() {
  const preferencesQuery = useQuery({
    queryKey: stylePreferencesKey,
    queryFn: ({ signal }) => fetchSavedPreferences(signal),
  });

  if (preferencesQuery.isPending) {
    return <Spinner />;
  }

  // Checked rather than isError, so a failed background refetch keeps the preferences on screen.
  if (preferencesQuery.data === undefined) {
    return (
      <ErrorState
        message={`Failed to load your style preferences: ${preferencesQuery.error?.message}`}
        onRetry={() => void preferencesQuery.refetch()}
      />
    );
  }

  return <StylePreferencesEditor saved={preferencesQuery.data} />;
}

type StylePreferencesEditorProps = {
  saved: StylePreferences;
};

function StylePreferencesEditor({ saved }: StylePreferencesEditorProps) {
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(saved);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(field: PreferenceField, value: string, pressed: boolean) {
    setDraft((current) => togglePreference(current, field, value, pressed));
  }

  function startEditing() {
    setDraft(saved);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError(null);
  }

  async function save(preferencesToSave: StylePreferences) {
    setError(null);
    setSaving(true);

    try {
      await saveStylePreferences(preferencesToSave);
      queryClient.setQueryData(stylePreferencesKey, preferencesToSave);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  const displayedPreferences = editing ? draft : saved;

  return (
    <>
      <Box className="mb-lg flex items-center justify-between gap-md">
        <Box className="flex items-center gap-md">
          <Link
            to="/profile/settings"
            aria-label="Back to settings"
            className="text-heading focus-ring"
          >
            ‹
          </Link>
          <Text variant="heading">Style Preferences</Text>
        </Box>
        {!editing && <Button label="Edit" variant="secondary" size="sm" onClick={startEditing} />}
      </Box>
      <Box className="flex flex-col gap-lg">
        <Box className="flex flex-col gap-md border p-lg">
          <PreferenceRow
            field="style"
            preferences={displayedPreferences}
            editing={editing}
            saving={saving}
            onToggle={toggle}
          />
        </Box>
        <Box className="flex flex-col gap-md border p-lg">
          <Text variant="subheading">Fit Preferences</Text>
          {fitFields.map((field) => (
            <PreferenceRow
              key={field}
              field={field}
              preferences={displayedPreferences}
              editing={editing}
              saving={saving}
              onToggle={toggle}
            />
          ))}
        </Box>
      </Box>
      {editing && (
        <Box className="sticky bottom-0 mt-lg flex items-center justify-end gap-xs border-t bg-background py-md">
          {error && (
            <Text variant="body" className="mr-auto text-error">
              Error: {error}
            </Text>
          )}
          <Button label="Cancel" variant="secondary" size="sm" disabled={saving} onClick={cancel} />
          <Button
            label="Save"
            size="sm"
            loading={saving}
            loadingLabel="Saving…"
            onClick={() => void save(draft)}
          />
        </Box>
      )}
    </>
  );
}

type PreferenceRowProps = {
  field: PreferenceField;
  preferences: StylePreferences;
  editing: boolean;
  saving: boolean;
  onToggle: (field: PreferenceField, value: string, pressed: boolean) => void;
};

function PreferenceRow({ field, preferences, editing, saving, onToggle }: PreferenceRowProps) {
  const { name, options } = questions[field];
  const picked = preferences[field];

  const shownOptions = editing
    ? options
    : options.filter((option) => picked.includes(option.value));

  return (
    <Box className="flex flex-col gap-xs">
      <Text variant="body">{name}</Text>
      {shownOptions.length === 0 && (
        <Text variant="body" className="text-secondary">
          No preference
        </Text>
      )}
      <Box className="flex flex-wrap gap-md">
        {shownOptions.map((option) => (
          <ImageCard
            key={option.value}
            label={option.label}
            src={null}
            pressed={picked.includes(option.value)}
            onPressedChange={(pressed) => onToggle(field, option.value, pressed)}
            size="sm"
            disabled={!editing || saving}
          />
        ))}
      </Box>
    </Box>
  );
}

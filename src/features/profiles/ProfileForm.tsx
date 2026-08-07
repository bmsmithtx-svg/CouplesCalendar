import { useMemo, useState, type SyntheticEvent } from 'react';

import { Button } from '../../components/ui/Button';
import { SelectField, TextField } from '../../components/ui/Fields';
import { getBrowserTimeZone, getTimeZoneOptions } from '../../lib/timezones';
import type { ProfileFieldErrors, ProfileInput, UserProfile } from './profileTypes';
import { validateProfileInput } from './profileValidation';

export function ProfileForm({
  initialProfile,
  isSaving,
  onSubmit,
  submitLabel,
}: {
  initialProfile: UserProfile | null;
  isSaving: boolean;
  onSubmit: (input: ProfileInput) => Promise<void>;
  submitLabel: string;
}) {
  const [displayName, setDisplayName] = useState(initialProfile?.displayName ?? '');
  const [defaultTimezone, setDefaultTimezone] = useState(
    initialProfile?.defaultTimezone ?? getBrowserTimeZone(),
  );
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const timezoneOptions = useMemo(() => {
    const supportedOptions = getTimeZoneOptions();

    if (supportedOptions.includes(defaultTimezone)) {
      return supportedOptions;
    }

    return [defaultTimezone, ...supportedOptions];
  }, [defaultTimezone]);

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitProfileForm();
  }

  async function submitProfileForm() {
    const validation = validateProfileInput({
      defaultTimezone,
      displayName,
    });

    if (!validation.ok) {
      setFieldErrors(validation.fieldErrors);
      return;
    }

    setFieldErrors({});
    await onSubmit(validation.values);
  }

  const options = useMemo(
    () =>
      timezoneOptions.map((timeZone) => ({
        label: timeZone.replaceAll('_', ' '),
        value: timeZone,
      })),
    [timezoneOptions],
  );

  return (
    <form aria-label="Profile form" className="cc-profile-form" noValidate onSubmit={handleSubmit}>
      <TextField
        autoComplete="name"
        error={fieldErrors.displayName}
        label="Display name"
        maxLength={80}
        onChange={(event) => {
          setDisplayName(event.currentTarget.value);
        }}
        placeholder="Your name"
        required
        value={displayName}
      />
      <SelectField
        error={fieldErrors.defaultTimezone}
        hint="Used as your default for profile and later calendar settings."
        label="Default timezone"
        onChange={(event) => {
          setDefaultTimezone(event.currentTarget.value);
        }}
        options={options}
        required
        value={defaultTimezone}
      />
      <Button isLoading={isSaving} type="submit" variant="primary">
        {submitLabel}
      </Button>
    </form>
  );
}

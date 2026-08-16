import { useMemo, useState, type SyntheticEvent } from 'react';

import { Button } from '../../components/ui/Button';
import { SelectField, TextareaField, TextField } from '../../components/ui/Fields';
import { getTimeZoneOptions } from '../../lib/timezones';
import type { CalendarEventWritable } from './calendarTypes';
import {
  validateCalendarEventFormInput,
  type CalendarEventFieldErrors,
  type CalendarEventFormInput,
} from './eventValidation';

type EventFormProps = {
  defaultInput: CalendarEventFormInput;
  error?: string | undefined;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (input: CalendarEventWritable) => void;
  submitLabel: string;
};

function updateValue(
  current: CalendarEventFormInput,
  key: keyof CalendarEventFormInput,
  value: boolean | string,
) {
  return {
    ...current,
    [key]: value,
  };
}

export function EventForm({
  defaultInput,
  error,
  isSaving,
  onCancel,
  onSubmit,
  submitLabel,
}: EventFormProps) {
  const [input, setInput] = useState(defaultInput);
  const [fieldErrors, setFieldErrors] = useState<CalendarEventFieldErrors>({});
  const timeZoneOptions = useMemo(
    () =>
      getTimeZoneOptions().map((timeZone) => ({
        label: timeZone,
        value: timeZone,
      })),
    [],
  );

  function setFieldValue(key: keyof CalendarEventFormInput, value: boolean | string) {
    setInput((current) => updateValue(current, key, value));
    setFieldErrors((current) => ({
      ...current,
      [key]: undefined,
    }));
  }

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateCalendarEventFormInput(input);

    if (!validation.ok) {
      setFieldErrors(validation.errors);
      return;
    }

    setFieldErrors({});
    onSubmit(validation.values);
  }

  return (
    <form className="cc-event-form" aria-label="Event form" onSubmit={handleSubmit}>
      {error ? (
        <p className="cc-form-error" role="alert">
          {error}
        </p>
      ) : null}

      <TextField
        error={fieldErrors.title}
        label="Title"
        maxLength={140}
        onChange={(event) => {
          setFieldValue('title', event.target.value);
        }}
        required
        value={input.title}
      />

      <label className="cc-checkbox-field">
        <input
          checked={input.isAllDay}
          onChange={(event) => {
            setFieldValue('isAllDay', event.target.checked);
          }}
          type="checkbox"
        />
        <span>All day</span>
      </label>

      <div className="cc-event-form__grid">
        <TextField
          error={fieldErrors.startDate}
          label="Start date"
          onChange={(event) => {
            setFieldValue('startDate', event.target.value);
          }}
          required
          type="date"
          value={input.startDate}
        />
        <TextField
          disabled={input.isAllDay}
          error={fieldErrors.startTime}
          label="Start time"
          onChange={(event) => {
            setFieldValue('startTime', event.target.value);
          }}
          required={!input.isAllDay}
          type="time"
          value={input.startTime}
        />
        <TextField
          error={fieldErrors.endDate}
          label="End date"
          onChange={(event) => {
            setFieldValue('endDate', event.target.value);
          }}
          required
          type="date"
          value={input.endDate}
        />
        <TextField
          disabled={input.isAllDay}
          error={fieldErrors.endTime}
          label="End time"
          onChange={(event) => {
            setFieldValue('endTime', event.target.value);
          }}
          required={!input.isAllDay}
          type="time"
          value={input.endTime}
        />
      </div>

      <SelectField
        error={fieldErrors.timeZone}
        label="Timezone"
        onChange={(event) => {
          setFieldValue('timeZone', event.target.value);
        }}
        options={timeZoneOptions}
        required
        value={input.timeZone}
      />

      <TextField
        error={fieldErrors.location}
        label="Location"
        maxLength={500}
        onChange={(event) => {
          setFieldValue('location', event.target.value);
        }}
        value={input.location}
      />

      <TextareaField
        error={fieldErrors.description}
        label="Notes"
        maxLength={5000}
        onChange={(event) => {
          setFieldValue('description', event.target.value);
        }}
        value={input.description}
      />

      <div className="cc-event-form__actions">
        <Button onClick={onCancel} variant="ghost">
          Cancel
        </Button>
        <Button isLoading={isSaving} type="submit" variant="primary">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

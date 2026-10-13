import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";

import {
  Avatar,
  BackgroundColor,
  BorderColor,
  Box,
  Button,
  Checkbox,
  Dialog,
  ColorScale,
  RadioGroup,
  StatusColor,
  Text,
  TextColor,
  Toggle,
  TypeScale,
  useToast,
} from "@/design-system";

export const Route = createFileRoute("/playground")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) {
      throw notFound();
    }
  },
  component: Playground,
});

const buttonVariants = ["primary", "secondary"] as const;

const buttonSizes = ["sm", "md", "lg"] as const;

const textVariants = ["heading", "subheading", "body", "caption"] as const;

const sectionTitles = {
  buttons: "Buttons",
  checkbox: "Checkbox",
  toggle: "Toggle",
  "radio-group": "Radio group",
  avatar: "Avatar",
  dialog: "Dialog",
  toast: "Toast",
  text: "Text",
  "color-scales": "Color scales",
  "semantic-colors": "Semantic colors",
} as const;

type SectionId = keyof typeof sectionTitles;

const navGroups = [
  {
    title: "Components",
    href: "#top",
    sections: ["buttons", "checkbox", "toggle", "radio-group", "avatar", "dialog", "toast", "text"],
  },
  { title: "Tokens", href: "#tokens", sections: ["color-scales", "semantic-colors"] },
] as const;

// Stand-in photo so the Avatar demo works without network access.
const samplePhoto =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><defs><linearGradient id="g"><stop stop-color="#F472B6"/><stop offset="1" stop-color="#6B7280"/></linearGradient></defs><rect width="1" height="1" fill="url(#g)"/></svg>',
  );

const radioOptions = [
  { label: "Small", value: "sm" },
  { label: "Medium", value: "md" },
  { label: "Large", value: "lg" },
];

// Text, background, and border colors only work with their own utility, so show
// the class to type. Status colors work with any utility; bg- is just an example.
const semanticGroups = [
  { title: "Text", classPrefix: "text-", colors: TextColor },
  { title: "Background", classPrefix: "bg-", colors: BackgroundColor },
  { title: "Border", classPrefix: "border-", colors: BorderColor },
  { title: "Status (any utility)", classPrefix: "bg-", colors: StatusColor },
] as const;

function Playground() {
  return (
    <Box className="min-h-screen bg-background text-primary font-sans">
      <Box className="flex gap-xl px-lg py-xl">
        <nav className="hidden w-40 shrink-0 md:block">
          <Box className="sticky top-xl flex flex-col gap-lg">
            {navGroups.map((group) => (
              <Box key={group.title} className="flex flex-col gap-xxs">
                <a href={group.href} className="text-subheading text-primary">
                  {group.title}
                </a>
                {group.sections.map((id) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    className="text-body text-secondary hover:text-primary"
                  >
                    {sectionTitles[id]}
                  </a>
                ))}
              </Box>
            ))}
          </Box>
        </nav>

        <main className="flex min-w-0 flex-1 flex-col gap-xl">
          <Box>
            <Text variant="heading">Design system playground</Text>
            <Text variant="body" className="text-secondary">
              All values are placeholders until designers hand over branding. Only visible on the
              local dev server.
            </Text>
          </Box>

          <Box className="flex flex-col gap-md">
            <Text variant="subheading">Components</Text>

            <Section id="buttons">
              <Box className="grid grid-cols-[repeat(6,max-content)] items-center gap-x-md gap-y-sm">
                <Box />
                {buttonSizes.map((size) => (
                  <Label key={size}>{size}</Label>
                ))}
                <Label>disabled</Label>
                <Label>loading</Label>

                {buttonVariants.map((variant) => (
                  <ButtonRow key={variant} variant={variant} />
                ))}
              </Box>
            </Section>

            <Section id="checkbox">
              <CheckboxExamples />
            </Section>

            <Section id="toggle">
              <ToggleExamples />
            </Section>

            <Section id="radio-group">
              <RadioExamples />
            </Section>

            <Section id="avatar">
              <Box className="flex items-end gap-md">
                <Avatar src={samplePhoto} alt="Sample photo, small" size="sm" />
                <Avatar src={samplePhoto} alt="Sample photo, medium" />
                <Avatar src={samplePhoto} alt="Sample photo, large" size="lg" />
                <Avatar src={null} alt="No photo" initials="VZ" size="sm" />
                <Avatar src={null} alt="No photo" initials="VZ" />
                <Avatar src={null} alt="No photo" initials="VZ" size="lg" />
                <Avatar src="/missing-photo.png" alt="Photo that fails to load" initials="AV" />
                <Avatar src={null} alt="No photo or initials" />
              </Box>
              <Label>photo sm · md · lg · initials sm · md · lg · failed load · no initials</Label>
            </Section>

            <Section id="dialog">
              <DialogExamples />
            </Section>

            <Section id="toast">
              <ToastExamples />
            </Section>

            <Section id="text">
              {textVariants.map((variant) => {
                const [fontSize, { lineHeight, fontWeight }] = TypeScale[variant];

                return (
                  <Box key={variant} className="flex flex-col gap-xxs">
                    <Text variant={variant}>The quick brown fox</Text>
                    <Label>
                      text-{variant} · {fontSize}/{lineHeight} · {fontWeight}
                    </Label>
                  </Box>
                );
              })}
            </Section>
          </Box>

          <Box className="flex flex-col gap-md">
            <Text variant="subheading" id="tokens" className="scroll-mt-xl">
              Tokens
            </Text>

            <Section id="color-scales">
              {Object.entries(ColorScale).map(([scaleName, scale]) => (
                <Box key={scaleName} className="flex flex-wrap gap-xs">
                  {Object.entries(scale).map(([step, value]) => (
                    <Swatch key={step} name={`${scaleName}-${step}`} value={value} />
                  ))}
                </Box>
              ))}
            </Section>

            <Section id="semantic-colors">
              {semanticGroups.map(({ title, classPrefix, colors }) => (
                <Box key={title} className="flex flex-col gap-xs">
                  <Label>{title}</Label>
                  <Box className="flex flex-wrap gap-xs">
                    {Object.entries(colors).map(([name, value]) => (
                      <Swatch
                        key={name}
                        name={name === "DEFAULT" ? "border" : `${classPrefix}${name}`}
                        value={value}
                      />
                    ))}
                  </Box>
                </Box>
              ))}
            </Section>
          </Box>
        </main>
      </Box>
    </Box>
  );
}

type SectionProps = {
  id: SectionId;
  children: ReactNode;
};

// scroll-mt keeps the heading clear of the top edge when jumped to from the nav.
function Section({ id, children }: SectionProps) {
  return (
    <section
      id={id}
      className="flex scroll-mt-xl flex-col gap-md rounded-lg border bg-surface p-lg"
    >
      <Text variant="subheading">{sectionTitles[id]}</Text>
      {children}
    </section>
  );
}

type ButtonRowProps = {
  variant: (typeof buttonVariants)[number];
};

function ButtonRow({ variant }: ButtonRowProps) {
  return (
    <>
      <Label>{variant}</Label>
      {buttonSizes.map((size) => (
        <Button key={size} label="Button" variant={variant} size={size} />
      ))}
      <Button label="Button" variant={variant} disabled />
      <Button label="Button" variant={variant} loading />
    </>
  );
}

function CheckboxExamples() {
  const [checked, setChecked] = useState(false);

  return (
    <Box className="flex flex-col gap-sm">
      <Checkbox label="Checkbox" checked={checked} onCheckedChange={setChecked} />
      <Checkbox label="Disabled" checked onCheckedChange={() => {}} disabled />
    </Box>
  );
}

function ToggleExamples() {
  const [checked, setChecked] = useState(false);

  return (
    <Box className="flex flex-col gap-sm">
      <Toggle label="Toggle" checked={checked} onCheckedChange={setChecked} />
      <Toggle label="Disabled" checked onCheckedChange={() => {}} disabled />
    </Box>
  );
}

function RadioExamples() {
  const [size, setSize] = useState<string | null>(null);

  return (
    <Box className="flex gap-xl">
      <RadioGroup label="Size" options={radioOptions} value={size} onValueChange={setSize} />
      <RadioGroup
        label="Disabled"
        options={radioOptions}
        value="md"
        onValueChange={() => {}}
        disabled
      />
    </Box>
  );
}

function DialogExamples() {
  const [openDialog, setOpenDialog] = useState<"confirm" | "dismissible" | null>(null);
  const close = () => setOpenDialog(null);

  return (
    <Box className="flex gap-sm">
      <Button label="Confirm dialog" onClick={() => setOpenDialog("confirm")} />
      <Button
        label="Dismissible dialog"
        variant="secondary"
        onClick={() => setOpenDialog("dismissible")}
      />

      <Dialog
        open={openDialog === "confirm"}
        onClose={close}
        title="Delete outfit?"
        message="Clicking outside won't close this one. Use a button or Esc."
        actions={[
          { label: "Cancel", variant: "secondary", onClick: close },
          { label: "Delete", variant: "primary", onClick: close },
        ]}
      />
      <Dialog
        open={openDialog === "dismissible"}
        onClose={close}
        title="Dismissible dialog"
        message="Clicking outside, Esc, the ×, or the button closes this one."
        actions={[{ label: "Got it", variant: "primary", onClick: close }]}
        dismissible
      />
    </Box>
  );
}

function ToastExamples() {
  const toast = useToast();

  return (
    <Box className="flex flex-wrap gap-sm">
      <Button label="Neutral" onClick={() => toast.show({ message: "Outfit saved" })} />
      <Button
        label="Success"
        onClick={() => toast.show({ message: "Profile updated", variant: "success" })}
      />
      <Button
        label="With subtitle"
        variant="secondary"
        onClick={() =>
          toast.show({ message: "Outfit saved", subtitle: "You can find it under Outfits." })
        }
      />
      <Button
        label="With action"
        variant="secondary"
        onClick={() =>
          toast.show({
            message: "Outfit deleted",
            action: { label: "Undo", onClick: () => toast.show({ message: "Restored" }) },
          })
        }
      />
    </Box>
  );
}

type LabelProps = {
  children: ReactNode;
};

function Label({ children }: LabelProps) {
  return (
    <Text variant="caption" className="text-secondary font-mono">
      {children}
    </Text>
  );
}

type SwatchProps = {
  name: string;
  value: string;
};

function Swatch({ name, value }: SwatchProps) {
  return (
    <Box className="flex flex-col gap-xxs w-24">
      <Box className="h-12 rounded-sm border" style={{ backgroundColor: value }} />
      <Label>{name}</Label>
      <Label>{value}</Label>
    </Box>
  );
}

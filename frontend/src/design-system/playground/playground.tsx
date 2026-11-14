import {
  ArrowRightIcon,
  CaretLeftIcon,
  CaretRightIcon,
  DiamondsFourIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ShareNetworkIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useState, type ReactNode } from "react";
import { z } from "zod";

import {
  Avatar,
  BackgroundColor,
  BorderColor,
  Box,
  Button,
  Checkbox,
  CodeInput,
  Dialog,
  Divider,
  Empty,
  Form,
  Header,
  IconButton,
  OutlineColor,
  ErrorState,
  ImageCard,
  Link,
  ListCard,
  Logo,
  OptionCardGroup,
  ProgressBar,
  RadioGroup,
  SearchField,
  StatusColor,
  Spinner,
  Tabs,
  Text,
  TextColor,
  TextButton,
  TextField,
  Toggle,
  TypeScale,
  useToast,
} from "@/design-system";

// Inlined despite the SVGs-are-files rule: only this dev page uses it, so it isn't an asset.
// A gradient shows how object-cover crops and scales at every size.
const samplePhoto = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><defs><linearGradient id="g"><stop stop-color="#000000"/><stop offset="1" stop-color="#FFFFFF"/></linearGradient></defs><rect width="1" height="1" fill="url(#g)"/></svg>',
)}`;

// Literal class names, so Tailwind generates them. See TypeScale for which styles need font-serif
// and uppercase.
const hifiTypeSamples = [
  { scale: "display", className: "text-display font-serif" },
  { scale: "heading-l", className: "text-heading-l font-serif" },
  { scale: "heading-m", className: "text-heading-m font-serif" },
  { scale: "heading-s", className: "text-heading-s" },
  { scale: "body-l", className: "text-body-l" },
  { scale: "body-m", className: "text-body-m" },
  { scale: "body-s", className: "text-body-s" },
  { scale: "label-l-strong", className: "text-label-l-strong" },
  { scale: "label-l", className: "text-label-l" },
  { scale: "label-m", className: "text-label-m uppercase" },
  { scale: "label-s", className: "text-label-s uppercase" },
  { scale: "overline", className: "text-overline uppercase" },
] as const;

const buttonVariants = ["primary", "secondary"] as const;

const buttonSizes = ["sm", "md", "lg"] as const;

// The serif variants are named for their role, so their type-scale keys differ.
const textSamples = [
  { variant: "display", scales: ["display-sm", "display-lg"] },
  { variant: "headline", scales: ["display-sm", "display-md"] },
  { variant: "heading", scales: ["heading"] },
  { variant: "subheading", scales: ["subheading"] },
  { variant: "body", scales: ["body"] },
  { variant: "caption", scales: ["caption"] },
] as const;

const sectionTitles = {
  buttons: "Buttons",
  link: "Link",
  header: "Header",
  checkbox: "Checkbox",
  toggle: "Toggle",
  "text-field": "Text field",
  form: "Form",
  "search-field": "Search field",
  "code-input": "Code input",
  "image-card": "Image card",
  "list-card": "List card",
  spinner: "Spinner",
  "progress-bar": "Progress bar",
  empty: "Empty",
  "error-state": "Error state",
  tabs: "Tabs",
  divider: "Divider",
  logo: "Logo",
  "radio-group": "Radio group",
  "option-card-group": "Option card group",
  avatar: "Avatar",
  dialog: "Dialog",
  toast: "Toast",
  text: "Text",
  "semantic-colors": "Semantic colors",
  "type-scale": "Type scale",
  shadows: "Shadows",
  "focus-ring": "Focus ring",
} as const;

type SectionId = keyof typeof sectionTitles;

const navGroups = [
  {
    title: "Components",
    hash: "components",
    sections: [
      "buttons",
      "link",
      "header",
      "checkbox",
      "toggle",
      "text-field",
      "form",
      "search-field",
      "code-input",
      "image-card",
      "list-card",
      "spinner",
      "progress-bar",
      "empty",
      "error-state",
      "tabs",
      "divider",
      "logo",
      "radio-group",
      "option-card-group",
      "avatar",
      "dialog",
      "toast",
      "text",
    ],
  },
  {
    title: "Tokens",
    hash: "tokens",
    sections: ["semantic-colors", "type-scale", "shadows", "focus-ring"],
  },
] as const;

const radioOptions = [
  { label: "Small", value: "sm" },
  { label: "Medium", value: "md" },
  { label: "Large", value: "lg" },
];

// Text, background, border, and outline colors only work with their own utility, so show
// the class to type. Status colors work with any utility; bg- is just an example.
const semanticGroups = [
  { title: "Text", classPrefix: "text-", colors: TextColor },
  { title: "Background", classPrefix: "bg-", colors: BackgroundColor },
  { title: "Border", classPrefix: "border-", colors: BorderColor },
  { title: "Outline", classPrefix: "outline-", colors: OutlineColor },
  { title: "Status (any utility)", classPrefix: "bg-", colors: StatusColor },
] as const;

export function Playground() {
  return (
    <Box className="min-h-screen">
      <Box className="flex gap-xl px-lg py-xl">
        {/* Wide enough for the longest section title. Not a design measurement, so no token. */}
        <nav className="hidden w-[160px] shrink-0 md:block">
          <Box className="sticky top-xl flex flex-col gap-lg">
            {navGroups.map((group) => (
              <Box key={group.title} className="flex flex-col gap-xxs">
                <Link to="/playground" hash={group.hash} className="text-subheading text-primary">
                  {group.title}
                </Link>
                {group.sections.map((id) => (
                  <Link
                    key={id}
                    to="/playground"
                    hash={id}
                    className="text-body text-secondary hover:text-primary"
                  >
                    {sectionTitles[id]}
                  </Link>
                ))}
              </Box>
            ))}
          </Box>
        </nav>

        <main className="flex min-w-0 flex-1 flex-col gap-xl">
          <Box>
            <Link variant="text" to="/dev" leadingIcon={CaretLeftIcon}>
              Dev
            </Link>
            <Text variant="heading" className="mt-md">
              Design system playground
            </Text>
            <Text variant="body" className="text-secondary">
              All values are placeholders until designers hand over branding.
            </Text>
          </Box>

          <Box className="flex flex-col gap-md">
            <Text variant="subheading" id="components" className="scroll-mt-xl">
              Components
            </Text>

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
              <Box className="flex items-center gap-md">
                <Button label="Back" variant="secondary" leadingIcon={CaretLeftIcon} />
                <Button label="Next" trailingIcon={CaretRightIcon} />
              </Box>
              <Label>leadingIcon · trailingIcon</Label>
              <Box className="flex items-center gap-md">
                <IconButton icon={PlusIcon} label="Add" variant="outlined" />
                <IconButton icon={ShareNetworkIcon} label="Share" variant="plain" />
                <IconButton icon={PlusIcon} label="Add" variant="outlined" disabled />
              </Box>
              <Label>IconButton · outlined · plain · disabled</Label>
              <TextButton label="swap item" onClick={() => {}} />
              <Label>TextButton</Label>
            </Section>

            <Section id="link">
              <Box className="flex items-center gap-md">
                <Link to="/playground">Default (unstyled)</Link>
                <Link variant="text" to="/playground">
                  Text
                </Link>
                <Link variant="text" to="/playground" leadingIcon={CaretLeftIcon}>
                  Leading icon
                </Link>
                <Link variant="text" to="/playground" trailingIcon={CaretRightIcon}>
                  Trailing icon
                </Link>
              </Box>
              <Box className="flex flex-wrap items-center gap-md">
                {buttonVariants.map((variant) =>
                  buttonSizes.map((size) => (
                    <Link key={`${variant}-${size}`} variant={variant} size={size} to="/playground">
                      Link
                    </Link>
                  )),
                )}
                <Link variant="secondary" to="/playground" trailingIcon={ArrowRightIcon}>
                  Trailing icon
                </Link>
              </Box>
              <Label>primary sm · md · lg · secondary sm · md · lg · trailing icon</Label>
            </Section>

            <Section id="header">
              <HeaderExamples />
            </Section>

            <Section id="checkbox">
              <CheckboxExamples />
            </Section>

            <Section id="toggle">
              <ToggleExamples />
            </Section>

            <Section id="text-field">
              <TextFieldExamples />
            </Section>

            <Section id="form">
              <FormExamples />
            </Section>

            <Section id="search-field">
              <SearchFieldExamples />
            </Section>

            <Section id="code-input">
              <CodeInputExamples />
            </Section>

            <Section id="image-card">
              <ImageCardExamples />
            </Section>

            <Section id="list-card">
              <Box className="flex max-w-content-sm flex-col gap-xs">
                <ListCard
                  title="Occasion"
                  value="Work"
                  action={{ label: "Edit", accessibleLabel: "Edit Occasion", onClick: () => {} }}
                />
                <ListCard title="No action" value="Read only" />
              </Box>
            </Section>

            <Section id="spinner">
              <Spinner />
            </Section>

            <Section id="progress-bar">
              <ProgressBarExamples />
            </Section>

            <Section id="empty">
              <Empty title="Nothing here yet" description="Items you add will show up here." />
            </Section>

            <Section id="error-state">
              <Box className="flex flex-col gap-md">
                <ErrorState message="Something went wrong." />
                <ErrorState message="Could not load your trips." onRetry={() => {}} />
              </Box>
            </Section>

            <Section id="tabs">
              <TabsExamples />
            </Section>

            <Section id="divider">
              <Box className="flex flex-col gap-xs">
                <Text variant="body">Above</Text>
                <Divider />
                <Text variant="body">Below</Text>
              </Box>
            </Section>

            <Section id="logo">
              <Logo className="w-full max-w-xs" />
            </Section>

            <Section id="radio-group">
              <RadioExamples />
            </Section>

            <Section id="option-card-group">
              <OptionCardExamples />
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
              {textSamples.map(({ variant, scales }) => (
                <Box key={variant} className="flex flex-col gap-xxs">
                  <Text variant={variant}>The quick brown fox</Text>
                  <Label>
                    {variant} · {scales.map((scale) => scaleLabel(scale)).join(" · lg:")}
                  </Label>
                </Box>
              ))}
            </Section>
          </Box>

          <Box className="flex flex-col gap-md">
            <Text variant="subheading" id="tokens" className="scroll-mt-xl">
              Tokens
            </Text>

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

            <Section id="type-scale">
              {hifiTypeSamples.map(({ scale, className }) => (
                <Box key={scale} className="flex flex-col gap-xxs">
                  <Box className={className}>The quick brown fox</Box>
                  <Label>{scaleLabel(scale, className)}</Label>
                </Box>
              ))}
            </Section>

            <Section id="shadows">
              <Box className="flex gap-lg">
                <Box className="bg-card p-lg text-body-m shadow-menu">shadow-menu</Box>
                <Box className="bg-card p-lg text-body-m shadow-toast">shadow-toast</Box>
              </Box>
            </Section>

            <Section id="focus-ring">
              <Box className="flex flex-col gap-xs">
                <Box className="flex gap-md bg-primary p-lg">
                  <Button
                    label="focus-inverse"
                    variant="secondary"
                    className="focus-visible:outline-focus-inverse"
                  />
                  <Button label="Default ring" variant="secondary" />
                </Box>
                <Label>
                  Tab into the buttons. On a dark surface, add focus-visible:outline-focus-inverse.
                </Label>
              </Box>
            </Section>
          </Box>
        </main>
      </Box>
    </Box>
  );
}

function scaleLabel(scale: keyof typeof TypeScale, className = `text-${scale}`) {
  const [fontSize, config] = TypeScale[scale];
  const letterSpacing = "letterSpacing" in config ? ` · ${config.letterSpacing}` : "";

  return `${className} · ${fontSize}/${config.lineHeight} · ${config.fontWeight}${letterSpacing}`;
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
      className="flex scroll-mt-xl flex-col gap-md rounded-lg border bg-placeholder p-lg"
    >
      <Text variant="subsubheading">{sectionTitles[id]}</Text>
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

function HeaderExamples() {
  const [featuresActive, setFeaturesActive] = useState(false);

  return (
    <Box className="flex flex-col gap-xs bg-background">
      <Header
        onLogoClick={() => setFeaturesActive(false)}
        items={[
          { label: "My profile", icon: UserIcon, to: "/playground" },
          {
            label: "Features",
            icon: MagnifyingGlassIcon,
            onClick: () => setFeaturesActive(true),
            active: featuresActive,
          },
          { label: "Get started", icon: ArrowRightIcon, to: "/playground" },
        ]}
      />
      <Label>Features is a view button and underlines when active. The logo resets it.</Label>
    </Box>
  );
}

function ProgressBarExamples() {
  return (
    <Box className="flex flex-col gap-xs">
      {[0, 1, 2].map((step) => (
        <ProgressBar key={step} label={`Step ${step} of 2`} step={step} stepCount={2} />
      ))}
      <Label>step 0 · 1 · 2 of 2</Label>
    </Box>
  );
}

const sampleTabs = [
  { value: "neckline", label: "Neckline" },
  { value: "bottoms", label: "Bottoms" },
  { value: "shoes", label: "Shoes" },
];

function TabsExamples() {
  const [tab, setTab] = useState("neckline");

  return (
    <Box className="flex flex-col gap-lg">
      <Tabs tabs={sampleTabs} value={tab} onValueChange={setTab} disabled={false}>
        <Text variant="body">Showing the {tab} panel.</Text>
      </Tabs>
      <Tabs
        tabs={sampleTabs.map((sample) => ({ ...sample, icon: DiamondsFourIcon }))}
        value={tab}
        onValueChange={setTab}
        disabled={false}
        appearance="underline"
      >
        <Text variant="body">Showing the {tab} panel, underline appearance.</Text>
      </Tabs>
    </Box>
  );
}

const sampleFormSchema = z.object({ email: z.email("Enter a valid email") });

function FormExamples() {
  const [submitted, setSubmitted] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { email: "" },
    validators: { onSubmit: sampleFormSchema },
    onSubmit: ({ value }) => setSubmitted(value.email),
  });

  return (
    <Form form={form} className="flex max-w-content-sm flex-col gap-md">
      <form.Field name="email">
        {(field) => (
          <TextField
            label="Email"
            value={field.state.value}
            onValueChange={field.handleChange}
            onBlur={field.handleBlur}
            error={field.state.meta.errors.at(0)?.message}
          />
        )}
      </form.Field>
      <Button label="Submit" type="submit" className="self-start" />
      {submitted && <Label>submitted {submitted}</Label>}
    </Form>
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

function TextFieldExamples() {
  const [value, setValue] = useState("");

  return (
    <Box className="flex max-w-content-sm flex-col gap-sm">
      <TextField
        label="Text field"
        placeholder="Type here"
        value={value}
        onValueChange={setValue}
      />
      <TextField label="Disabled" value="Can't edit" onValueChange={() => {}} disabled />
      <TextField
        label="Hidden label"
        hideLabel
        placeholder="Label is read by screen readers only"
        value={value}
        onValueChange={setValue}
      />
    </Box>
  );
}

function CodeInputExamples() {
  const [code, setCode] = useState("");

  return (
    <Box className="flex flex-col gap-md">
      <CodeInput label="Verification code" length={6} value={code} onValueChange={setCode} />
      <CodeInput label="Filled" length={6} value="123456" onValueChange={() => {}} />
      <CodeInput
        label="Invalid"
        length={6}
        value="123456"
        onValueChange={() => {}}
        error="Incorrect code entered. Please try again."
      />
      <CodeInput label="Disabled" length={6} value="12" onValueChange={() => {}} disabled />
    </Box>
  );
}

function SearchFieldExamples() {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);

  return (
    <Box className="flex max-w-content-sm flex-col gap-sm">
      <SearchField
        label="Describe your own"
        placeholder="Describe your own…"
        value={value}
        onValueChange={setValue}
        onSubmit={() => setSubmitted(value)}
      />
      <Label>submitted on Enter: {submitted ?? "nothing yet"}</Label>
      <SearchField
        label="Inactive"
        placeholder="Describe your own…"
        value="Typed, but a card is selected"
        onValueChange={() => {}}
        onSubmit={() => {}}
        inactive
      />
      <SearchField
        label="With a leading icon"
        placeholder="Search items"
        value=""
        onValueChange={() => {}}
        onSubmit={() => {}}
        leadingIcon={MagnifyingGlassIcon}
      />
    </Box>
  );
}

function ImageCardExamples() {
  const [pressed, setPressed] = useState(false);

  return (
    <Box className="grid max-w-content-lg grid-cols-3 gap-md">
      <ImageCard
        label="Pressable"
        src={samplePhoto}
        pressed={pressed}
        onPressedChange={setPressed}
      />
      <ImageCard label="No image" src={null} pressed={false} onPressedChange={() => {}} />
      <ImageCard
        label="Failed load"
        src="/missing-photo.png"
        pressed={false}
        onPressedChange={() => {}}
      />
    </Box>
  );
}

function OptionCardExamples() {
  const [size, setSize] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);

  return (
    <Box className="flex max-w-content-lg flex-col gap-xl">
      <OptionCardGroup label="Size" options={radioOptions} value={size} onValueChange={setSize} />
      <OptionCardGroup
        label="One column"
        options={[
          { label: "Yes", value: "yes" },
          { label: "No", value: "no" },
        ]}
        value={answer}
        onValueChange={setAnswer}
        className="grid grid-cols-1 gap-md"
      />
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
  const [openDialog, setOpenDialog] = useState<"confirm" | "dismissible" | "content" | null>(null);

  const [dialogName, setDialogName] = useState("Weekend look");
  const close = () => setOpenDialog(null);

  return (
    <Box className="flex gap-sm">
      <Button label="Confirm dialog" onClick={() => setOpenDialog("confirm")} />
      <Button
        label="Dismissible dialog"
        variant="secondary"
        onClick={() => setOpenDialog("dismissible")}
      />
      <Button
        label="Dialog with content"
        variant="secondary"
        onClick={() => setOpenDialog("content")}
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
      <Dialog
        open={openDialog === "content"}
        onClose={close}
        title="Name your outfit"
        actions={[
          { label: "Cancel", variant: "secondary", onClick: close, disabled: true },
          { label: "Save", variant: "primary", onClick: close, loading: true },
        ]}
      >
        <TextField label="Outfit name" value={dialogName} onValueChange={setDialogName} />
      </Dialog>
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
    <Text variant="caption" className="text-secondary">
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
    <Box className="flex w-[96px] flex-col gap-xxs">
      <Box className="h-xxxl rounded-sm border" style={{ backgroundColor: value }} />
      <Label>{name}</Label>
      <Label>{value}</Label>
    </Box>
  );
}

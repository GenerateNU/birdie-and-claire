import {
  ArrowRightIcon,
  CaretLeftIcon,
  CaretRightIcon,
  DiamondsFourIcon,
  EnvelopeSimpleIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ShareNetworkIcon,
  SunIcon,
  UserIcon,
  XIcon,
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
  Chip,
  ChoiceGroup,
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
  OptionTileGroup,
  ProgressBar,
  RadioGroup,
  SearchField,
  SegmentedControl,
  StatusColor,
  Spinner,
  Tabs,
  Text,
  TextArea,
  TextColor,
  TextButton,
  TextField,
  TextLink,
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

const buttonVariants = ["primary", "secondary", "ghost", "destructive"] as const;

const buttonSizes = ["sm", "md"] as const;

// Literal class names so Tailwind generates them. The important modifier makes a resting button
// show its hover or pressed look, which the pointer can't hold still for a screenshot.
const forcedButtonStates = {
  primary: { hover: "!bg-primary-hover", pressed: "!bg-primary-pressed" },
  secondary: { hover: "!bg-hover", pressed: "!bg-pressed" },
  ghost: { hover: "!bg-hover", pressed: "!bg-pressed" },
  destructive: { hover: "!bg-error-hover", pressed: "!bg-error-pressed" },
} as const;

const iconButtonVariants = ["primary", "secondary", "ghost"] as const;

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
  "text-area": "Text area",
  chip: "Chip",
  "segmented-control": "Segmented control",
  "choice-group": "Choice group",
  "option-tile-group": "Option tile group",
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
      "text-area",
      "chip",
      "segmented-control",
      "choice-group",
      "option-tile-group",
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
            <TextLink to="/dev" leadingIcon={CaretLeftIcon}>
              Dev
            </TextLink>
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
              <Box className="grid grid-cols-[repeat(7,max-content)] items-center gap-x-md gap-y-sm">
                <Box />
                {buttonSizes.map((size) => (
                  <Label key={size}>{size}</Label>
                ))}
                <Label>hover</Label>
                <Label>pressed</Label>
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
              <Box className="grid grid-cols-[repeat(5,max-content)] items-center gap-x-md gap-y-sm">
                <Box />
                <Label>md</Label>
                <Label>sm</Label>
                <Label>hover</Label>
                <Label>pressed</Label>
                {iconButtonVariants.map((variant) => (
                  <IconButtonRow key={variant} variant={variant} />
                ))}
              </Box>
              <Label>IconButton · primary · secondary · ghost, disabled below</Label>
              <Box className="flex items-center gap-md">
                {iconButtonVariants.map((variant) => (
                  <IconButton
                    key={variant}
                    icon={ShareNetworkIcon}
                    label="Share"
                    variant={variant}
                    disabled
                  />
                ))}
              </Box>
              <TextButton label="swap item" onClick={() => {}} />
              <Label>TextButton</Label>
            </Section>

            <Section id="link">
              <Box className="flex items-center gap-md">
                <Link to="/playground">Default (unstyled)</Link>
                <TextLink to="/playground">See all</TextLink>
                <TextLink to="/playground" className="underline">
                  Forced hover
                </TextLink>
                <TextLink to="/playground" leadingIcon={CaretLeftIcon}>
                  Leading icon
                </TextLink>
                <TextLink to="/playground" trailingIcon={ArrowRightIcon}>
                  Trailing icon
                </TextLink>
              </Box>
              <Label>TextLink · default · hover · leading icon · trailing icon</Label>
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
              <Label>Link as a Button · every variant at sm and md · trailing icon</Label>
            </Section>

            <Section id="header">
              <HeaderExamples />
            </Section>

            <Section id="checkbox">
              <Stage>
                <CheckboxExamples />
              </Stage>
            </Section>

            <Section id="toggle">
              <ToggleExamples />
            </Section>

            <Section id="text-field">
              <Stage>
                <TextFieldExamples />
              </Stage>
            </Section>

            <Section id="text-area">
              <Stage>
                <TextAreaExamples />
              </Stage>
            </Section>

            <Section id="chip">
              <Stage>
                <ChipExamples />
              </Stage>
            </Section>

            <Section id="segmented-control">
              <Stage>
                <SegmentedControlExamples />
              </Stage>
            </Section>

            <Section id="choice-group">
              <Stage>
                <ChoiceGroupExamples />
              </Stage>
            </Section>

            <Section id="option-tile-group">
              <Stage>
                <OptionTileGroupExamples />
              </Stage>
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
              <Stage>
                <RadioExamples />
              </Stage>
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
      <Button label="Button" variant={variant} className={forcedButtonStates[variant].hover} />
      <Button label="Button" variant={variant} className={forcedButtonStates[variant].pressed} />
      <Button label="Button" variant={variant} disabled />
      <Button label="Button" variant={variant} loading />
    </>
  );
}

type IconButtonRowProps = {
  variant: (typeof iconButtonVariants)[number];
};

function IconButtonRow({ variant }: IconButtonRowProps) {
  const forced = forcedButtonStates[variant];

  return (
    <>
      <Label>{variant}</Label>
      <IconButton icon={PlusIcon} label="Add" variant={variant} />
      <IconButton icon={PlusIcon} label="Add" variant={variant} size="sm" />
      <IconButton icon={PlusIcon} label="Add" variant={variant} className={forced.hover} />
      <IconButton icon={PlusIcon} label="Add" variant={variant} className={forced.pressed} />
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

// Literal class names so Tailwind generates them. A checkbox or radio shows its hover look when
// its label is hovered, so the box is forced directly.
const checkboxRows = [
  { name: "Off", checked: false, indeterminate: false, hover: "[&_[role=checkbox]]:!bg-hover" },
  {
    name: "On",
    checked: true,
    indeterminate: false,
    hover: "[&_[role=checkbox]]:!bg-primary-hover",
  },
  {
    name: "Indeterminate",
    checked: false,
    indeterminate: true,
    hover: "[&_[role=checkbox]]:!bg-primary-hover",
  },
] as const;

function CheckboxExamples() {
  const [checked, setChecked] = useState(false);

  return (
    <Box className="flex flex-col gap-md">
      <Box className="grid grid-cols-[repeat(4,max-content)] items-center gap-x-xl gap-y-sm">
        <Box />
        <Label>default</Label>
        <Label>hover</Label>
        <Label>disabled</Label>
        {checkboxRows.map((row) => (
          <CheckboxRow key={row.name} {...row} />
        ))}
      </Box>
      <Checkbox label="Interactive" checked={checked} onCheckedChange={setChecked} />
    </Box>
  );
}

type CheckboxRowProps = (typeof checkboxRows)[number];

function CheckboxRow({ name, checked, indeterminate, hover }: CheckboxRowProps) {
  return (
    <>
      <Label>{name}</Label>
      <Checkbox
        label="Label"
        checked={checked}
        indeterminate={indeterminate}
        onCheckedChange={() => {}}
      />
      <Checkbox
        label="Label"
        checked={checked}
        indeterminate={indeterminate}
        onCheckedChange={() => {}}
        className={hover}
      />
      <Checkbox
        label="Label"
        checked={checked}
        indeterminate={indeterminate}
        onCheckedChange={() => {}}
        disabled
      />
    </>
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

// Forces the focused look onto the box around the input, which a screenshot can't focus.
const forcedFocusedField = "[&_div:has(>input)]:!border-medium [&_div:has(>input)]:!border-primary";

function TextFieldExamples() {
  const [value, setValue] = useState("");

  return (
    <Box className="flex flex-col gap-lg">
      <Box className="grid max-w-content-lg grid-cols-3 items-start gap-md">
        <TextField label="Empty" placeholder="Placeholder" value="" onValueChange={() => {}} />
        <TextField
          label="Helper text"
          helper="We never share your email."
          placeholder="Placeholder"
          value=""
          onValueChange={() => {}}
        />
        <TextField
          label="Focused"
          value="Placeholder"
          onValueChange={() => {}}
          className={forcedFocusedField}
        />
        <TextField label="Filled" value="Placeholder" onValueChange={() => {}} />
        <TextField label="Error" value="Placeholder" onValueChange={() => {}} error="Error text" />
        <TextField label="Disabled" value="Placeholder" onValueChange={() => {}} disabled />
        <TextField
          label="Leading icon"
          placeholder="Placeholder"
          value=""
          onValueChange={() => {}}
          leadingIcon={EnvelopeSimpleIcon}
        />
        <TextField
          label="Trailing icon"
          value="Placeholder"
          onValueChange={() => {}}
          trailingIcon={XIcon}
        />
        <TextField
          label="Both icons, disabled"
          value="Placeholder"
          onValueChange={() => {}}
          leadingIcon={EnvelopeSimpleIcon}
          trailingIcon={XIcon}
          disabled
        />
      </Box>
      <Box className="flex max-w-content-sm flex-col gap-sm">
        <TextField
          label="Interactive"
          placeholder="Type here"
          value={value}
          onValueChange={setValue}
        />
        <TextField
          label="Hidden label"
          hideLabel
          placeholder="Label is read by screen readers only"
          value={value}
          onValueChange={setValue}
        />
      </Box>
    </Box>
  );
}

const forcedFocusedTextArea = "[&_textarea]:!border-medium [&_textarea]:!border-primary";

function TextAreaExamples() {
  const [value, setValue] = useState("");

  return (
    <Box className="flex flex-col gap-lg">
      <Box className="grid max-w-content-lg grid-cols-3 items-start gap-md">
        <TextArea
          label="Empty"
          placeholder="Placeholder"
          maxLength={250}
          value=""
          onValueChange={() => {}}
        />
        <TextArea
          label="Focused"
          maxLength={250}
          value="Placeholder"
          onValueChange={() => {}}
          className={forcedFocusedTextArea}
        />
        <TextArea
          label="Filled, with helper"
          helper="Helper text"
          maxLength={250}
          value="Placeholder"
          onValueChange={() => {}}
        />
        <TextArea
          label="Error"
          maxLength={250}
          value="Placeholder"
          onValueChange={() => {}}
          error="Error message"
        />
        <TextArea
          label="Disabled"
          maxLength={250}
          value="Placeholder"
          onValueChange={() => {}}
          disabled
        />
        <TextArea label="No count" value="Placeholder" onValueChange={() => {}} />
      </Box>
      <Box className="max-w-content-sm">
        <TextArea
          label="Interactive"
          placeholder="Type here"
          maxLength={250}
          value={value}
          onValueChange={setValue}
        />
      </Box>
    </Box>
  );
}

const chipSizes = ["md", "sm"] as const;

function ChipExamples() {
  const [selected, setSelected] = useState(false);

  return (
    <Box className="flex flex-col gap-md">
      <Box className="grid grid-cols-[repeat(5,max-content)] items-center gap-x-xl gap-y-sm">
        <Box />
        <Label>default</Label>
        <Label>hover</Label>
        <Label>selected</Label>
        <Label>disabled</Label>
        {chipSizes.map((size) => (
          <ChipRow key={size} size={size} />
        ))}
      </Box>
      <Box className="flex items-center gap-md">
        <Chip label="Add" selected={false} onSelectedChange={() => {}} leadingIcon={PlusIcon} />
        <Chip label="Removable" selected={false} onSelectedChange={() => {}} trailingIcon={XIcon} />
        <Chip
          label="Both"
          selected
          onSelectedChange={() => {}}
          leadingIcon={PlusIcon}
          trailingIcon={XIcon}
        />
        <Chip
          label="Disabled"
          selected={false}
          onSelectedChange={() => {}}
          leadingIcon={PlusIcon}
          trailingIcon={XIcon}
          disabled
        />
        <Chip label="Interactive" selected={selected} onSelectedChange={setSelected} />
      </Box>
      <Label>leading icon · trailing icon · both · disabled with icons · interactive</Label>
    </Box>
  );
}

type ChipRowProps = {
  size: (typeof chipSizes)[number];
};

function ChipRow({ size }: ChipRowProps) {
  return (
    <>
      <Label>{size}</Label>
      <Chip label="Chip" selected={false} onSelectedChange={() => {}} size={size} />
      <Chip
        label="Chip"
        selected={false}
        onSelectedChange={() => {}}
        size={size}
        className="!bg-pressed"
      />
      <Chip label="Chip" selected onSelectedChange={() => {}} size={size} />
      <Chip label="Chip" selected={false} onSelectedChange={() => {}} size={size} disabled />
    </>
  );
}

const segmentOptions = [
  { label: "Option 1", value: "one" },
  { label: "Option 2", value: "two" },
  { label: "Option 3", value: "three" },
  { label: "Option 4", value: "four" },
];

function SegmentedControlExamples() {
  const [value, setValue] = useState("one");

  return (
    <Box className="flex flex-col items-start gap-md">
      {[2, 3, 4].map((count) => (
        <SegmentedControl
          key={count}
          label={`${count} options`}
          options={segmentOptions.slice(0, count)}
          value={value}
          onValueChange={setValue}
        />
      ))}
      <Label>2 · 3 · 4 options. Click to change the selection.</Label>
      <Box className="flex items-center gap-xl">
        <Box className="flex flex-col gap-xs">
          <SegmentedControl
            label="Hover"
            options={segmentOptions.slice(0, 3)}
            value="one"
            onValueChange={() => {}}
            className="[&_[role=radio]:not([data-checked])]:!bg-hover"
          />
          <Label>hover on unselected segments</Label>
        </Box>
        <Box className="flex flex-col gap-xs">
          <SegmentedControl
            label="Disabled"
            options={segmentOptions.slice(0, 3)}
            value="one"
            onValueChange={() => {}}
            disabled
          />
          <Label>disabled</Label>
        </Box>
      </Box>
    </Box>
  );
}

const choiceRowStates = [
  { name: "default", selected: false, disabled: false, forced: "" },
  {
    name: "hover",
    selected: false,
    disabled: false,
    forced: "[&_[role=radio]]:!border-primary [&_[role=radio]>div:last-child]:!bg-hover",
  },
  { name: "selected", selected: true, disabled: false, forced: "" },
  { name: "disabled", selected: false, disabled: true, forced: "" },
] as const;

const choiceOptions = [
  { label: "Option 1", value: "one" },
  { label: "Option 2", value: "two" },
  { label: "Option 3", value: "three" },
  { label: "Option 4", value: "four" },
];

function ChoiceGroupExamples() {
  const [choice, setChoice] = useState<string | null>("one");

  return (
    <Box className="flex flex-col gap-lg">
      <Box className="grid grid-cols-2 gap-md">
        {choiceRowStates.map((state) => (
          <Box key={state.name} className="flex flex-col gap-xs">
            <Label>{state.name}</Label>
            <Box className={state.forced}>
              <ChoiceGroup
                options={[
                  {
                    label: "Yes",
                    subtitle: "Bring me to the Birdie & Claire catalog",
                    value: "yes",
                    disabled: state.disabled,
                  },
                ]}
                value={state.selected ? "yes" : null}
                onValueChange={() => {}}
              />
            </Box>
          </Box>
        ))}
      </Box>
      <Box className="max-w-content-sm">
        <ChoiceGroup
          label="Four options, no subtitles"
          options={choiceOptions}
          value={choice}
          onValueChange={setChoice}
        />
      </Box>
    </Box>
  );
}

const tileStates = [
  { name: "default", selected: false, disabled: false, forced: "" },
  { name: "hover", selected: false, disabled: false, forced: "[&_[role=radio]]:!border-primary" },
  { name: "selected", selected: true, disabled: false, forced: "" },
  { name: "disabled", selected: false, disabled: true, forced: "" },
] as const;

function OptionTileGroupExamples() {
  const [weather, setWeather] = useState<string | null>(null);

  return (
    <Box className="flex flex-col gap-lg">
      <Box className="flex flex-wrap gap-md">
        {tileStates.map((state) => (
          <Box key={state.name} className="flex flex-col gap-xs">
            <Label>{state.name}</Label>
            <Box className={state.forced}>
              <OptionTileGroup
                options={[
                  {
                    label: "Hot",
                    subtitle: "80° and up",
                    icon: SunIcon,
                    value: "hot",
                    disabled: state.disabled,
                  },
                ]}
                value={state.selected ? "hot" : null}
                onValueChange={() => {}}
              />
            </Box>
          </Box>
        ))}
      </Box>
      <OptionTileGroup
        label="No icon or subtitle"
        options={radioOptions}
        value={weather}
        onValueChange={setWeather}
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

const singleRadio = [{ label: "Label", value: "label" }];

const radioRows = [
  { name: "Off", value: null },
  { name: "On", value: "label" },
] as const;

function RadioExamples() {
  const [size, setSize] = useState<string | null>(null);

  return (
    <Box className="flex flex-col gap-lg">
      <Box className="grid grid-cols-[repeat(4,max-content)] items-center gap-x-xl gap-y-sm">
        <Box />
        <Label>default</Label>
        <Label>hover</Label>
        <Label>disabled</Label>
        {radioRows.map((row) => (
          <RadioRow key={row.name} {...row} />
        ))}
      </Box>
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
    </Box>
  );
}

type RadioRowProps = (typeof radioRows)[number];

function RadioRow({ name, value }: RadioRowProps) {
  return (
    <>
      <Label>{name}</Label>
      <RadioGroup options={singleRadio} value={value} onValueChange={() => {}} />
      <RadioGroup
        options={singleRadio}
        value={value}
        onValueChange={() => {}}
        className="[&_[role=radio]]:!bg-hover"
      />
      <RadioGroup options={singleRadio} value={value} onValueChange={() => {}} disabled />
    </>
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

// Hi-fi inputs are drawn for the page background. The section's own fill would hide a disabled
// checkbox, whose fill is the same slate.
function Stage({ children }: { children: ReactNode }) {
  return <Box className="bg-background p-md">{children}</Box>;
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

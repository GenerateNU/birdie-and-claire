import { createFileRoute, notFound } from "@tanstack/react-router";
import type { ReactNode } from "react";

import {
  BackgroundColor,
  BorderColor,
  Box,
  Button,
  ColorScale,
  Divider,
  StatusColor,
  Text,
  TextColor,
  TypeScale,
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

// Each semantic group only works with one utility, so show the class to type.
const semanticGroups = [
  { title: "Text", classPrefix: "text-", colors: TextColor },
  { title: "Background", classPrefix: "bg-", colors: BackgroundColor },
  { title: "Border", classPrefix: "border-", colors: BorderColor },
  { title: "Status (any utility)", classPrefix: "bg-", colors: StatusColor },
] as const;

function Playground() {
  return (
    <Box className="min-h-screen bg-background text-primary font-sans p-xl flex flex-col gap-xl">
      <Box>
        <Text variant="heading">Design system playground</Text>
        <Text variant="body" className="text-secondary">
          All values are placeholders until designers hand over branding. Only visible on the local
          dev server.
        </Text>
      </Box>

      <Section title="Buttons">
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

      <Section title="Text">
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

      <Section title="Color scales">
        {Object.entries(ColorScale).map(([scaleName, scale]) => (
          <Box key={scaleName} className="flex flex-wrap gap-xs">
            {Object.entries(scale).map(([step, value]) => (
              <Swatch key={step} name={`${scaleName}-${step}`} value={value} />
            ))}
          </Box>
        ))}
      </Section>

      <Section title="Semantic colors">
        {semanticGroups.map(({ title, classPrefix, colors }) => (
          <Box key={title} className="flex flex-col gap-xs">
            <Text variant="subheading">{title}</Text>
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
  );
}

type SectionProps = {
  title: string;
  children: ReactNode;
};

function Section({ title, children }: SectionProps) {
  return (
    <Box className="flex flex-col gap-md">
      <Divider className="border-t-2 mb-md" />
      <Text variant="subheading">{title}</Text>
      {children}
    </Box>
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

// A disabled radio leaves group-hover out, because group-hover would win over a disabled class.
export const radioStateClasses = {
  enabled: "border-primary bg-card group-hover:bg-hover",
  disabled: "border-disabled bg-disabled",
};

export const dotStateClasses = {
  enabled: "bg-primary",
  disabled: "bg-control-off",
};
